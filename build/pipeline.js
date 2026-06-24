// pipeline.js — turn one markdown string into a sanitized, highlighted HTML
// fragment plus the metadata the engine needs (title, table of contents).
//
// Plugin order matters:
//   parse → gfm → rehype(no raw HTML) → SANITIZE → slug → autolink → shiki → stringify
// Sanitize runs BEFORE slug/autolink/shiki so that (a) untrusted markdown HTML is
// neutralised, while (b) the trusted, generated output of slug/autolink/shiki is
// emitted verbatim — and crucially so rehype-slug's heading ids are NOT rewritten
// by sanitize's id-clobbering (which would break anchor links).

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeShiki from '@shikijs/rehype'
import rehypeStringify from 'rehype-stringify'
import { visit } from 'unist-util-visit'
import { toString } from 'hast-util-to-string'
import matter from 'gray-matter'

// Pull the first <h1> out of the tree: its text becomes the page title and the
// node is removed so the engine can render the title in its own chrome.
function extractTitle(store) {
  return (tree) => {
    let done = false
    visit(tree, 'element', (node, index, parent) => {
      if (done || node.tagName !== 'h1' || !parent || index === undefined) return
      store.title = toString(node).trim()
      parent.children.splice(index, 1)
      done = true
      return [visit.SKIP, index]
    })
  }
}

// Collect h2/h3 headings (after slug has assigned ids) into a flat TOC.
function collectToc(store) {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'h2' && node.tagName !== 'h3') return
      const id = node.properties?.id
      if (!id) return
      store.toc.push({
        depth: node.tagName === 'h2' ? 2 : 3,
        id: String(id),
        text: toString(node).trim(),
      })
    })
  }
}

// Rewrite relative markdown links (e.g. ./package-managers/npm.md, ../docker)
// to absolute doc URLs the in-app router understands. Absolute, external and
// in-page (#) links are left untouched.
function rewriteLinks({ basePath, versionPrefix, currentDir }) {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'a' || !node.properties) return
      const href = node.properties.href
      if (typeof href !== 'string' || !href) return
      if (/^[a-z]+:/i.test(href) || href.startsWith('/') || href.startsWith('#')) return
      const [pathPart, hash = ''] = href.split('#')
      const slug = resolveSlug(currentDir, pathPart)
      if (slug === null) return
      node.properties.href =
        `${basePath}${versionPrefix}/${slug}`.replace(/\/index$/, '') + (hash ? `#${hash}` : '')
      node.properties['data-docs-link'] = ''
    })
  }
}

// Resolve a relative link target against the current file's directory and strip
// the .md/.html extension, yielding a doc slug like "package-managers/npm".
function resolveSlug(currentDir, rel) {
  const cleaned = rel.replace(/\.(md|markdown|html)$/i, '').replace(/\/$/, '')
  const segs = (currentDir ? currentDir.split('/') : []).filter(Boolean)
  for (const part of cleaned.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') segs.pop()
    else segs.push(part)
  }
  return segs.join('/')
}

// Rewrite relative <img> sources (e.g. images/foo.png, ../shared/diagram.svg) to
// the absolute bundle URL the assets are copied to at build time:
//   <assetBaseUrl>/<dir>/images/foo.png  ==  /docs-content/<version>/<locale>/...
// Absolute (/...), external (http:, data:) and protocol-relative srcs are left
// untouched. Mirrors rewriteLinks; runs after sanitize so the generated root-
// relative URL is emitted verbatim.
function rewriteImages({ assetBaseUrl, currentDir }) {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img' || !node.properties) return
      const src = node.properties.src
      if (typeof src !== 'string' || !src) return
      if (/^[a-z]+:/i.test(src) || src.startsWith('/') || src.startsWith('//')) return
      const resolved = resolveAssetPath(currentDir, src)
      if (!resolved) return
      node.properties.src = `${assetBaseUrl}/${resolved}`
    })
  }
}

// Resolve a relative asset target against the current file's directory, keeping
// the file extension (and dropping any ?query/#hash). Yields a bundle-relative
// path like "web-ui/images/license-policy.png".
function resolveAssetPath(currentDir, rel) {
  const [pathPart] = rel.split(/[?#]/)
  const segs = (currentDir ? currentDir.split('/') : []).filter(Boolean)
  for (const part of pathPart.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') segs.pop()
    else segs.push(part)
  }
  return segs.join('/')
}

export async function renderMarkdown(
  raw,
  { basePath = '/docs', versionPrefix = '', currentDir = '', assetBaseUrl = '' } = {},
) {
  // Strip optional frontmatter (none today, but authors may add it later).
  const { content, data } = matter(raw)
  const store = { title: '', toc: [] }

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSanitize)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: 'wrap' })
    .use(extractTitle, store)
    .use(collectToc, store)
    .use(rewriteLinks, { basePath, versionPrefix, currentDir })
    .use(rewriteImages, { assetBaseUrl, currentDir })
    .use(rehypeShiki, {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    })
    .use(rehypeStringify)
    .process(content)

  return {
    html: String(file),
    title: data.title || store.title || '',
    toc: store.toc,
    order: typeof data.order === 'number' ? data.order : undefined,
  }
}
