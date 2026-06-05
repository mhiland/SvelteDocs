// index.js — orchestrate the content bundle build.
//
//   buildContentBundle({ repoUrl, outDir, basePath })
//
// Clones the content repo, builds every version (each git tag + `main`→latest)
// for every locale present, and writes a static bundle:
//
//   <outDir>/manifest.json
//   <outDir>/<version>/<locale>/<page>.json
//   <outDir>/<version>/<locale>/search-index.json
//
// The bundle is served same-origin and consumed by the <Docs> engine at runtime.

import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { renderMarkdown } from './pipeline.js'
import { buildNav, urlFor } from './nav.js'
import { buildSearchDocs } from './search.js'
import { cloneRepo, enumerateRefs, checkout, listLocales, listMarkdown } from './clone.js'

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data))
}

export async function buildContentBundle({ repoUrl, local, outDir, basePath = '/docs', workDir }) {
  if (!repoUrl && !local) throw new Error('buildContentBundle: repoUrl or local is required')
  if (!outDir) throw new Error('buildContentBundle: outDir is required')

  // `local` reads an existing directory directly (no clone, no git) and builds a
  // single `latest` version — handy for the demo and offline builds. Otherwise
  // clone the repo and build a version per tag.
  let clonePath
  let refs
  if (local) {
    clonePath = local
    refs = [{ ref: null, slug: 'latest', label: 'Latest' }]
    log(`using local content ${local}`)
  } else {
    clonePath = workDir || join(tmpdir(), `svelte-docs-clone-${process.pid}`)
    log(`cloning ${redact(repoUrl)}`)
    cloneRepo(repoUrl, clonePath)
    refs = enumerateRefs(clonePath)
  }
  log(`versions: ${refs.map((r) => r.slug).join(', ')}`)

  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })

  const manifest = {
    schema: 1,
    generatedAt: new Date().toISOString(),
    basePath,
    defaultVersion: 'latest',
    versions: [],
    nav: {},
  }

  for (const { ref, slug, label } of refs) {
    if (ref !== null) checkout(clonePath, ref)
    const versionPrefix = slug === 'latest' ? '' : `/${slug}`
    const locales = listLocales(clonePath)
    if (!locales.length) {
      log(`  ${slug}: no docs/<locale> dirs, skipping`)
      continue
    }
    manifest.versions.push({ slug, label, ref, locales })
    manifest.nav[slug] = {}

    for (const locale of locales) {
      const files = listMarkdown(clonePath, locale)
      const pages = []
      for (const f of files) {
        const raw = readFileSync(f.absPath, 'utf8')
        const { html, title, toc, order } = await renderMarkdown(raw, {
          basePath,
          versionPrefix,
          currentDir: f.dir,
        })
        pages.push({
          slug: f.slug,
          title,
          html,
          toc,
          order,
          url: urlFor(f.slug, basePath, versionPrefix),
        })
      }

      const { tree, flat } = buildNav(pages, { basePath, versionPrefix })
      manifest.nav[slug][locale] = tree

      // prev/next from the depth-first ordering.
      const indexBySlug = new Map(flat.map((n, i) => [n.slug, i]))
      const lite = (n) => (n ? { slug: n.slug, title: n.title, url: n.url } : null)
      for (const page of pages) {
        const i = indexBySlug.get(page.slug)
        const prev = i > 0 ? lite(flat[i - 1]) : null
        const next = i >= 0 && i < flat.length - 1 ? lite(flat[i + 1]) : null
        writeJson(join(outDir, slug, locale, `${page.slug}.json`), {
          schema: 1,
          slug: page.slug,
          title: page.title,
          html: page.html,
          toc: page.toc,
          prev,
          next,
        })
      }

      writeJson(join(outDir, slug, locale, 'search-index.json'), {
        schema: 1,
        docs: buildSearchDocs(pages),
      })
      log(`  ${slug}/${locale}: ${pages.length} pages`)
    }
  }

  writeJson(join(outDir, 'manifest.json'), manifest)
  if (!local) rmSync(clonePath, { recursive: true, force: true })
  log(`done → ${outDir}`)
  return manifest
}

function log(msg) {
  process.stdout.write(`svelte-docs-build: ${msg}\n`)
}
function redact(url) {
  return url.replace(/\/\/[^@/]+@/, '//***@')
}
