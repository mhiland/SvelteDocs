<script>
  import { DocsRouter, parseRoute } from './router.svelte.js'
  import { makeT } from './i18n/strings.js'
  import Sidebar from './components/Sidebar.svelte'
  import Toc from './components/Toc.svelte'
  import Page from './components/Page.svelte'
  import PrevNext from './components/PrevNext.svelte'
  import Search from './components/Search.svelte'
  import VersionSwitcher from './components/VersionSwitcher.svelte'
  import LanguageSelect from './components/LanguageSelect.svelte'

  let {
    basePath = '/docs',
    manifestUrl = '/docs-content/manifest.json',
    contentBaseUrl = '/docs-content',
    locale = 'en',
    onLocaleChange = () => {},
    locales = [],
    fallbackLocale = 'en',
    onNavigate = () => {},
  } = $props()

  let manifest = $state(null)
  let router = $state(null)
  let pageData = $state(null)
  let usedFallback = $state(false)
  let searchOpen = $state(false)
  let sidebarOpen = $state(false)
  let loadSeq = 0

  const t = $derived(makeT(locale))

  // Router: create once, tear down on destroy.
  $effect(() => {
    const r = new DocsRouter(basePath)
    router = r
    return () => r.destroy()
  })

  // Manifest: fetch once.
  $effect(() => {
    let alive = true
    fetch(manifestUrl)
      .then((r) => r.json())
      .then((m) => {
        if (alive) manifest = m
      })
      .catch(() => {})
    return () => (alive = false)
  })

  const versionSlugs = $derived(manifest ? manifest.versions.map((v) => v.slug) : [])
  const route = $derived(router && manifest ? parseRoute(router.path, basePath, versionSlugs) : null)

  function versionPrefix(slug) {
    return slug === 'latest' ? '' : `/${slug}`
  }
  function pageUrl(version, page) {
    const url = `${basePath}${versionPrefix(version)}/${page}`.replace(/\/index$/, '')
    return url || basePath
  }

  const currentUrl = $derived(route ? pageUrl(route.version, route.page) : basePath)

  const navTree = $derived.by(() => {
    if (!manifest || !route) return []
    const byLocale = manifest.nav[route.version] || {}
    return byLocale[locale] || byLocale[fallbackLocale] || []
  })

  // Load the current page JSON whenever route or locale changes (latest wins).
  $effect(() => {
    if (!route) return
    const { version, page } = route
    const seq = ++loadSeq
    const tryLocale = locale
    ;(async () => {
      let fellBack = false
      let res = await fetch(`${contentBaseUrl}/${version}/${tryLocale}/${page}.json`)
      if (!res.ok && tryLocale !== fallbackLocale) {
        res = await fetch(`${contentBaseUrl}/${version}/${fallbackLocale}/${page}.json`)
        fellBack = res.ok
      }
      const data = res.ok ? await res.json() : null
      if (seq !== loadSeq) return // a newer navigation superseded this one
      pageData = data
      usedFallback = fellBack
      sidebarOpen = false
      if (data?.title) document.title = data.title
    })()
  })

  function changeVersion(slug) {
    router?.navigate(pageUrl(slug, route?.page ?? 'index'))
    onNavigate(pageUrl(slug, route?.page ?? 'index'))
  }

  // Cmd/Ctrl-K toggles search.
  $effect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchOpen = !searchOpen
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
</script>

<div class="docs-root">
  <header class="docs-header">
    <button
      type="button"
      class="docs-menu-toggle"
      aria-label={t('menu')}
      onclick={() => (sidebarOpen = !sidebarOpen)}>☰</button
    >
    <a class="docs-home-link" href={basePath}>Docs</a>
    <div class="docs-header-spacer"></div>
    <button type="button" class="docs-search-button" onclick={() => (searchOpen = true)}>
      <span>{t('searchPlaceholder')}</span>
      <kbd>⌘K</kbd>
    </button>
    {#if manifest && route}
      <VersionSwitcher
        versions={manifest.versions}
        current={route.version}
        onChange={changeVersion}
        label={t('version')}
      />
    {/if}
    <LanguageSelect {locales} current={locale} onChange={onLocaleChange} label={t('language')} />
  </header>

  <div class="docs-body">
    <aside class="docs-aside" data-open={sidebarOpen ? 'true' : 'false'}>
      <Sidebar nav={navTree} {currentUrl} />
    </aside>

    <main class="docs-main">
      {#if !manifest || !route}
        <div class="docs-loading"></div>
      {:else}
        <Page page={pageData} {t} showFallback={usedFallback} />
        {#if pageData}
          <PrevNext prev={pageData.prev} next={pageData.next} {t} />
        {/if}
      {/if}
    </main>

    <aside class="docs-toc-rail">
      {#if pageData}
        <Toc toc={pageData.toc} {t} />
      {/if}
    </aside>
  </div>

  <Search
    open={searchOpen}
    onClose={() => (searchOpen = false)}
    {contentBaseUrl}
    version={route?.version ?? 'latest'}
    {locale}
    {fallbackLocale}
    {t}
    onNavigate={(url) => {
      router?.navigate(url)
      onNavigate(url)
    }}
  />
</div>
