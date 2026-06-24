// router.svelte.js — a tiny client router scoped to `basePath`.
//
// It cooperates with a host that has no router: it only intercepts left-clicks
// on same-origin links whose path is under `basePath`. Anything else (the
// marketing pages, external links, modified clicks) falls through to a normal
// browser navigation, so the docs engine never hijacks the host app.

export class DocsRouter {
  path = $state(typeof location !== 'undefined' ? location.pathname : '/')

  #basePath
  #onPop
  #onClick

  constructor(basePath) {
    this.#basePath = basePath
    this.#onPop = () => {
      this.path = location.pathname
    }
    this.#onClick = (e) => this.#intercept(e)
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', this.#onPop)
      document.addEventListener('click', this.#onClick)
    }
  }

  #intercept(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return
    const a = e.target.closest?.('a[href]')
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return
    let url
    try {
      url = new URL(a.href)
    } catch {
      return
    }
    if (url.origin !== location.origin || !url.pathname.startsWith(this.#basePath)) return
    e.preventDefault()
    this.navigate(url.pathname + url.hash)
  }

  navigate(to) {
    const [pathname, hash] = to.split('#')
    if (pathname !== location.pathname || (hash ?? '') !== location.hash.replace('#', '')) {
      history.pushState({}, '', to)
    }
    this.path = pathname
    if (hash) {
      // Defer so the target page has rendered.
      queueMicrotask(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' }))
    } else {
      window.scrollTo({ top: 0 })
    }
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('popstate', this.#onPop)
      document.removeEventListener('click', this.#onClick)
    }
  }
}

// Parse a pathname into { version, page } given the manifest's known versions.
// `latest` is un-prefixed; tagged versions appear as the first path segment.
export function parseRoute(pathname, basePath, versionSlugs) {
  let rest = pathname.slice(basePath.length).replace(/^\/+/, '').replace(/\/+$/, '')
  const segs = rest ? rest.split('/') : []
  let version = 'latest'
  if (segs.length && versionSlugs.includes(segs[0]) && segs[0] !== 'latest') {
    version = segs.shift()
  }
  const page = segs.length ? segs.join('/') : 'index'
  return { version, page }
}
