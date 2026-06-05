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
    // Top-left brand: the label, and where clicking it goes. `homeUrl` defaults
    // to the site root so embedded docs link back to the host's home page; set
    // it to `basePath` for a standalone docs site.
    siteName = 'Docs',
    homeUrl = '/',
    // Theme toggle. Pass the host's current theme ('light'|'dark') and its
    // toggle function and the engine renders a matching toggle button in the
    // header. Omit `onToggleTheme` to hide it (docs still inherit the theme via
    // the host's `data-theme` either way).
    theme = undefined,
    onToggleTheme = undefined,
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
    <a class="docs-home-link" href={homeUrl}>{siteName}</a>
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
    {#if onToggleTheme}
      <button
        type="button"
        class="docs-theme-toggle"
        aria-label={t('toggleTheme')}
        onclick={onToggleTheme}
      >
        {#if theme === 'dark'}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path
              d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"
            />
          </svg>
        {:else}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        {/if}
      </button>
    {/if}
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
