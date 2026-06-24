# @dependably/svelte-docs

A small, **reusable Svelte 5 documentation engine**. It renders a docs section
**client-side, inside an existing Svelte app** (same dev server, same bundle) —
no second framework, no separate site. Content comes from a markdown git repo
and is pre-built into a static JSON bundle, so it works on any static host.

Features: sidebar nav, git-tag-based **version switcher**, **language select**
(reuses the host's i18n), lazy **FlexSearch** full-text search, build-time
**Shiki** syntax highlighting, dark mode via the host's CSS variables.

## Two parts

- **Runtime engine** (`@dependably/svelte-docs`) — a `<Docs>` Svelte component.
- **Build toolkit** (`@dependably/svelte-docs/build` + `svelte-docs-build` CLI) —
  turns a markdown git repo into a static content bundle.

## Build a content bundle

```sh
svelte-docs-build --repo <git-url> --out <dir>/docs-content [--base-path /docs]
```

Clones the repo, builds **every git tag** (+ `main` → `latest`) for every locale
under `docs/<locale>/`, and writes:

```
<out>/manifest.json
<out>/<version>/<locale>/<page>.json        # {html, toc, prev, next, title}
<out>/<version>/<locale>/search-index.json
```

The bundle is served same-origin (e.g. at `/docs-content`) and fetched by the
engine at runtime. (`<git-url>` may be a tokenized HTTPS URL in CI.)

## Render in a host app

```svelte
<script>
  import Docs from '@dependably/svelte-docs'
  import '@dependably/svelte-docs/styles.css'
  import { locale } from 'svelte-i18n'
  import { applyLocale, locales } from './locale.js'
</script>

<Docs
  basePath="/docs"
  siteName="Dependably"
  homeUrl="/"
  manifestUrl="/docs-content/manifest.json"
  contentBaseUrl="/docs-content"
  locale={$locale}
  onLocaleChange={applyLocale}
  {locales}
  fallbackLocale="en"
/>
```

The host owns routing fall-through (render `<Docs>` when
`location.pathname.startsWith('/docs')`), i18n locale, and theme. The engine
needs the host's static server to serve `index.html` for unknown `/docs/*`
paths (SPA fallback) so deep links resolve.

### Props

| prop             | default                       | purpose                                                                                                   |
| ---------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| `basePath`       | `/docs`                       | URL prefix the engine owns                                                                                |
| `siteName`       | `Docs`                        | top-left brand label                                                                                      |
| `homeUrl`        | `/`                           | where the brand link goes (site root for embedded docs; set to `basePath` for a standalone docs site)     |
| `manifestUrl`    | `/docs-content/manifest.json` | first fetch                                                                                               |
| `contentBaseUrl` | `/docs-content`               | root for page JSON + search indexes                                                                       |
| `locale`         | `en`                          | host's current locale (reactive)                                                                          |
| `onLocaleChange` | —                             | called by the engine's language select                                                                    |
| `locales`        | `[]`                          | `[{code,label}]` for the language select                                                                  |
| `fallbackLocale` | `en`                          | used when a page/locale is missing                                                                        |
| `theme`          | —                             | host's current theme (`'light'`/`'dark'`) for the toggle icon                                             |
| `onToggleTheme`  | —                             | host's theme toggle; pass it to show a toggle button (the engine reads the theme from `html[data-theme]`) |
| `onNavigate`     | —                             | optional navigation hook                                                                                  |

## Theming

Colours come from the host's CSS variables (`--bg`, `--bg2`, `--bg3`,
`--border`, `--text`, `--text2`, `--accent`, `--accent-hover`, `--accent-soft`,
`--radius`); dark mode follows the host's `html[data-theme]`. Typography is
overridable the same way via `--docs-font` and `--docs-font-mono`. Fallbacks are
provided so it also works standalone, and animations respect
`prefers-reduced-motion`.

The engine sets `document.title` per page and restores the host's original title
when unmounted, so an SPA host that navigates in/out of `/docs` without a full
reload isn't left with a stale title.

## Local development

```sh
npm ci
npm run demo            # vite dev server (demo/) against demo/public/docs-content
```

## Notes

- Ships as **Svelte source**; the host compiles it (so it tracks the host's
  Svelte version). `svelte` is a peer dependency.
- Page HTML is **sanitized at build time** (`rehype-sanitize`, no
  `allowDangerousHtml`) and injected with `{@html}` — content is treated as
  first-party/trusted.
- The committed `package-lock.json` pins already-aged dependency versions; when
  refreshing deps behind a quarantining registry, resolve with
  `npm install --before=<~3 weeks ago>`.
