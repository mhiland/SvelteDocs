# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@dependably/svelte-docs` — a reusable **Svelte 5 documentation engine** that renders a docs
section _client-side, inside an existing Svelte app_ (same dev server, same bundle), plus a
**build toolkit** that turns a markdown git repo into a static JSON content bundle.

The two halves are decoupled by the bundle format: the build toolkit (`build/`, Node) emits a
static bundle; the runtime engine (`src/`, Svelte) fetches and renders it. They share no code —
only the on-disk contract under `<out>/`.

## Commands

```sh
npm ci                  # install (runs husky via the prepare script)
npm run demo            # vite dev server in demo/ (predemo rebuilds demo content first)
npm run demo:content    # rebuild demo bundle from demo/sample-content into demo/public/docs-content
npm run build:lib       # vite build (compile-check; the lib actually ships as source)
npm run check           # node --check on build/cli.js and build/index.js (syntax only)
npm run lint            # eslint (flat config, ES2024, eslint-plugin-svelte)
npm run lint:fix        # eslint --fix
npm run format          # prettier --write .
npm run format:check    # prettier --check . (the CI gate)
```

There is **no test suite**. The automated gates are `lint`, `format:check`, and `check`
(syntax). A **Husky pre-commit hook** runs `lint-staged` (eslint --fix + prettier --write on
staged files). CI (`.github/workflows/ci.yml`) runs lint + format:check + check plus a
**TruffleHog** secret scan on push/PR. Releases (`.github/workflows/release.yml`, on `v*` tags)
`npm pack` the tarball, attach it to a GitHub Release, and generate **SLSA build provenance**
(`actions/attest-build-provenance`, verify with `gh attestation verify`). Verify behavioral
changes by running `npm run demo`.

ESLint policy note: a few deliberate engine patterns are accommodated in `eslint.config.js`
(non-reactive `Set`/`Map`/`URL`; `svelte-ignore` comments for compiler a11y warnings) and
`no-at-html-tags` is disabled **only** for `src/components/Page.svelte` (build-time-sanitized
content) — it stays on everywhere else.

The build CLI:

```sh
node build/cli.js --repo <git-url> --out <dir> [--base-path /docs]   # clone, build a version per tag
node build/cli.js --local <dir> --out <dir> [--base-path /docs]      # read a dir directly as `latest`
```

## Architecture

### Runtime engine (`src/`) — ships as Svelte SOURCE

The package exports Svelte source, not compiled output; the **host app compiles it**, so the
engine tracks the host's Svelte version (`svelte` is a peer dep). `vite.config.js` only powers
the local demo — it does not produce the shipped artifact.

- `src/index.js` — public entry, re-exports `Docs.svelte`.
- `src/Docs.svelte` — the single `<Docs>` component and all orchestration: fetches the manifest
  and per-page JSON, owns layout/chrome, wires the router. Driven by props (see README's prop
  table). State is Svelte 5 runes (`$state`/`$derived`/`$effect`).
- `src/router.svelte.js` — `DocsRouter`, a tiny client router **scoped to `basePath`**. It only
  intercepts plain left-clicks on same-origin links under `basePath`; everything else (external
  links, modified clicks, the host's own pages) falls through to normal browser navigation, so
  the engine never hijacks the host app. `parseRoute()` splits a pathname into `{version, page}`
  (`latest` is un-prefixed; tagged versions are the first path segment).
- `src/components/` — Sidebar, Toc, Page, PrevNext, Search (lazy FlexSearch), VersionSwitcher,
  LanguageSelect.
- `src/i18n/strings.js` — UI string table + `makeT(locale)`. Distinct from the _host's_ i18n,
  which the host owns; the engine only consumes the host's locale via the `locale` prop.

The host owns routing fall-through (render `<Docs>` only when the path is under `basePath`),
i18n locale, and theme. The host's static server must serve `index.html` for unknown `/docs/*`
paths (SPA fallback) for deep links to resolve.

### Build toolkit (`build/`) — plain Node, no Svelte

Pipeline: `cli.js` → `index.js` (`buildContentBundle`) orchestrates.

- `clone.js` — clones the content repo and enumerates refs: **every git tag** plus `main`→`latest`
  (pinned first; tags sorted descending semver). `--local` skips git and builds a single `latest`.
  Reuses one working tree, `git checkout`-ing each ref in turn. Discovers locales under
  `docs/<locale>/`.
- `pipeline.js` — `renderMarkdown`: one markdown string → sanitized, highlighted HTML + metadata.
  **Plugin order is load-bearing:** parse → gfm → rehype (no raw HTML) → **sanitize** → slug →
  autolink → shiki → stringify. Sanitize runs _before_ slug/autolink/shiki so untrusted markdown
  HTML is neutralized while the trusted generated output (heading ids, anchors, Shiki spans) is
  emitted verbatim. The first `<h1>` is extracted as the page title and removed from the body;
  h2/h3 become the TOC.
- `nav.js` — flat page list → sidebar tree + depth-first prev/next order. Conventions (no
  frontmatter required): `index` first, top-level pages before subdirectory categories, a
  subdirectory becomes a collapsible category (humanized name), within a group `order` frontmatter
  wins, then title, then slug.
- `search.js` — builds the per-version/locale FlexSearch document set.

### Bundle format (the contract between the two halves)

```
<out>/manifest.json                              # {schema, basePath, defaultVersion, versions[], nav{}}
<out>/<version>/<locale>/<page>.json             # {html, toc, prev, next, title}
<out>/<version>/<locale>/search-index.json
```

Served same-origin (e.g. `/docs-content`), fetched by the engine at runtime. Works on any static
host.

## Conventions & gotchas

- **Security model:** page HTML is sanitized at _build time_ (`rehype-sanitize`, no
  `allowDangerousHtml`) and injected with `{@html}`; content is treated as first-party/trusted.
  If you touch `pipeline.js`, preserve the sanitize-before-generate ordering above.
- **Theming** is entirely via the host's CSS variables (`--bg`, `--text`, `--accent`, `--radius`,
  etc.) and `html[data-theme]`; fallbacks let it work standalone. The engine sets `document.title`
  per page and restores the host's original on unmount.
- **Dependency refresh:** `package-lock.json` pins intentionally aged versions. When refreshing
  behind a quarantining registry, resolve with `npm install --before=<~3 weeks ago>`.
- `demo/public/docs-content/` is gitignored and regenerated by `predemo`/`demo:content`.
