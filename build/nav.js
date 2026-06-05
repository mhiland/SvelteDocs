// nav.js — turn a flat list of rendered pages into a sidebar tree and a
// depth-first ordering used for prev/next.
//
// Conventions (content has no frontmatter today):
//   - `index` is always first.
//   - Top-level pages come before categories.
//   - A subdirectory becomes a collapsible category; its humanised name is the
//     title (e.g. "package-managers" → "Package managers").
//   - Within a group: explicit `order` frontmatter wins, then title, then slug.

export function urlFor(slug, basePath, versionPrefix) {
  const url = `${basePath}${versionPrefix}/${slug}`.replace(/\/index$/, '')
  return url || basePath
}

function humanize(dir) {
  const last = dir.split('/').pop() || dir
  return last.replace(/[-_]/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

function sortEntries(a, b) {
  if (a.slug === 'index') return -1
  if (b.slug === 'index') return 1
  if (a.order !== undefined || b.order !== undefined) {
    return (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)
  }
  return (a.title || a.slug).localeCompare(b.title || b.slug)
}

export function buildNav(pages, { basePath, versionPrefix }) {
  const roots = []
  const categories = new Map() // dir -> {slug, title, children:[]}

  for (const p of pages) {
    const dir = p.slug.includes('/') ? p.slug.slice(0, p.slug.lastIndexOf('/')) : ''
    const node = {
      type: 'page',
      slug: p.slug,
      title: p.title || p.slug,
      url: urlFor(p.slug, basePath, versionPrefix),
      order: p.order,
    }
    if (dir === '') {
      roots.push(node)
    } else {
      const top = dir.split('/')[0]
      if (!categories.has(top)) categories.set(top, { type: 'category', slug: top, title: humanize(top), children: [] })
      categories.get(top).children.push(node)
    }
  }

  roots.sort(sortEntries)
  const cats = [...categories.values()].sort((a, b) => a.title.localeCompare(b.title))
  for (const c of cats) c.children.sort(sortEntries)

  const tree = [...roots, ...cats]

  // Depth-first flatten for prev/next (categories are not themselves pages).
  const flat = []
  for (const node of tree) {
    if (node.type === 'page') flat.push(node)
    else for (const child of node.children) flat.push(child)
  }

  return { tree, flat }
}
