// clone.js — clone the content repo and enumerate the refs we build a version
// for: every tag, plus `main` mapped to the `latest` slug. Content repos are
// small (markdown), so a plain clone is simplest and reliable; we reuse the one
// working tree and `git checkout` each ref in turn.

import { execFileSync } from 'node:child_process'
import { readdirSync, statSync, existsSync, rmSync } from 'node:fs'
import { join, relative } from 'node:path'

function git(dir, args) {
  return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim()
}

export function cloneRepo(repoUrl, dir) {
  rmSync(dir, { recursive: true, force: true })
  execFileSync('git', ['clone', '--quiet', '--no-single-branch', repoUrl, dir], {
    stdio: 'inherit',
  })
}

// Semver-ish descending sort for tags; non-semver tags sort after, lexically.
function compareVersionsDesc(a, b) {
  const pa = a.replace(/^v/, '').split('.').map(Number)
  const pb = b.replace(/^v/, '').split('.').map(Number)
  const semverA = pa.every((n) => Number.isFinite(n)) && pa.length >= 2
  const semverB = pb.every((n) => Number.isFinite(n)) && pb.length >= 2
  if (semverA && semverB) {
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const d = (pb[i] || 0) - (pa[i] || 0)
      if (d) return d
    }
    return 0
  }
  if (semverA) return -1
  if (semverB) return 1
  return b.localeCompare(a)
}

export function enumerateRefs(dir) {
  const tags = git(dir, ['tag', '-l']).split('\n').filter(Boolean).sort(compareVersionsDesc)
  // `latest` (main) is pinned first; tags follow in descending version order.
  return [
    { ref: 'main', slug: 'latest', label: 'Latest' },
    ...tags.map((t) => ({ ref: t, slug: t, label: t.replace(/^v/, '') })),
  ]
}

export function checkout(dir, ref) {
  git(dir, ['checkout', '--quiet', '--force', ref])
}

export function refSha(dir, ref) {
  return git(dir, ['rev-parse', ref])
}

// Locales = subdirectories of docs/ that contain markdown.
export function listLocales(dir) {
  const docsDir = join(dir, 'docs')
  if (!existsSync(docsDir)) return []
  return readdirSync(docsDir)
    .filter((name) => {
      const p = join(docsDir, name)
      return statSync(p).isDirectory()
    })
    .sort()
}

// Walk docs/<locale> for .md files; return { slug, absPath, dir } per file.
export function listMarkdown(dir, locale) {
  const root = join(dir, 'docs', locale)
  const out = []
  function walk(current) {
    for (const name of readdirSync(current)) {
      const abs = join(current, name)
      if (statSync(abs).isDirectory()) {
        walk(abs)
      } else if (/\.(md|markdown)$/i.test(name)) {
        const rel = relative(root, abs).replace(/\\/g, '/')
        const slug = rel.replace(/\.(md|markdown)$/i, '')
        const slugDir = slug.includes('/') ? slug.slice(0, slug.lastIndexOf('/')) : ''
        out.push({ slug, absPath: abs, dir: slugDir })
      }
    }
  }
  if (existsSync(root)) walk(root)
  return out
}

// Image extensions copied verbatim into the bundle so relative <img> refs in the
// markdown resolve. Keep in sync with rewriteImages in pipeline.js.
const IMAGE_RE = /\.(png|jpe?g|gif|svg|webp|avif|bmp|ico|apng)$/i

// Walk docs/<locale> for image files; return { absPath, rel } per file, where
// `rel` is the path relative to docs/<locale> (e.g. "web-ui/images/foo.png").
export function listImages(dir, locale) {
  const root = join(dir, 'docs', locale)
  const out = []
  function walk(current) {
    for (const name of readdirSync(current)) {
      const abs = join(current, name)
      if (statSync(abs).isDirectory()) {
        walk(abs)
      } else if (IMAGE_RE.test(name)) {
        out.push({ absPath: abs, rel: relative(root, abs).replace(/\\/g, '/') })
      }
    }
  }
  if (existsSync(root)) walk(root)
  return out
}
