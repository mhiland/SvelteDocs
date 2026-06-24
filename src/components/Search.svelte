<script>
  // Lazy full-text search. FlexSearch and the per-(version,locale) index JSON
  // load only when the modal first opens, so they never touch the initial docs
  // payload. Indexes are cached per key for the session.
  let {
    open = false,
    onClose,
    contentBaseUrl,
    version,
    locale,
    fallbackLocale = 'en',
    t,
    onNavigate,
  } = $props()

  const cache = new Map() // `${version}:${locale}` -> { index, docsById }

  const humanize = (s) => s.replace(/[-_]/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
  function breadcrumbOf(slug) {
    const i = slug.lastIndexOf('/')
    return i < 0 ? '' : slug.slice(0, i).split('/').map(humanize).join(' › ')
  }
  let query = $state('')
  let results = $state([])
  let active = $state(0)
  let loading = $state(false)
  let inputEl = $state(null)
  let modalEl = $state(null)
  let triggerEl = null // element focused before the modal opened, to restore on close

  async function loadIndex(key) {
    if (cache.has(key)) return cache.get(key)
    const FlexSearch = (await import('flexsearch')).default
    let res = await fetch(`${contentBaseUrl}/${version}/${locale}/search-index.json`)
    if (!res.ok && locale !== fallbackLocale) {
      res = await fetch(`${contentBaseUrl}/${version}/${fallbackLocale}/search-index.json`)
    }
    if (!res.ok) {
      // Don't cache the failure — a transient blip shouldn't kill search for
      // the rest of the session; the next open retries.
      return { index: null, docsById: new Map() }
    }
    const data = await res.json()
    const index = new FlexSearch.Document({
      tokenize: 'forward',
      document: { id: 'id', index: ['title', 'headings', 'text'] },
    })
    const docsById = new Map()
    for (const d of data.docs) {
      index.add(d)
      docsById.set(d.id, { id: d.id, title: d.title, url: d.url, breadcrumb: breadcrumbOf(d.id) })
    }
    const built = { index, docsById }
    cache.set(key, built)
    return built
  }

  function runSearch(q, built) {
    if (!built.index || !q.trim()) {
      results = []
      active = 0
      return
    }
    const hits = built.index.search(q, { limit: 12 })
    const seen = new Set()
    const out = []
    for (const group of hits) {
      for (const id of group.result) {
        if (seen.has(id)) continue
        seen.add(id)
        const doc = built.docsById.get(id)
        if (doc) out.push(doc)
      }
    }
    results = out
    active = 0
  }

  // Build/refresh the index when the modal is open; re-run on query change.
  $effect(() => {
    if (!open) return
    const key = `${version}:${locale}`
    loading = true
    loadIndex(key)
      .then((built) => runSearch(query, built))
      .finally(() => (loading = false))
  })

  // Focus the input on open; restore focus to the trigger (e.g. the search
  // button) on close — expected behaviour for an aria-modal dialog.
  $effect(() => {
    if (open) {
      if (!triggerEl) triggerEl = document.activeElement
      inputEl?.focus()
    } else if (triggerEl) {
      const el = triggerEl
      triggerEl = null
      el.focus?.()
    }
  })

  // Trap Tab within the dialog while it's open.
  function onModalKeydown(e) {
    if (e.key !== 'Tab' || !modalEl) return
    const focusables = modalEl.querySelectorAll(
      'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
    )
    if (!focusables.length) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  function onInput(e) {
    query = e.currentTarget.value
    const built = cache.get(`${version}:${locale}`)
    if (built) runSearch(query, built)
  }

  function go(doc) {
    if (!doc) return
    onNavigate(doc.url)
    onClose()
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      active = Math.min(active + 1, results.length - 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      active = Math.max(active - 1, 0)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(results[active])
    }
  }
</script>

{#if open}
  <!-- Backdrop click closes; the keyboard path (Escape) lives on the input below. -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="docs-search-overlay" role="presentation" onclick={onClose}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      bind:this={modalEl}
      class="docs-search-modal"
      role="dialog"
      aria-modal="true"
      aria-label={t('search')}
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={onModalKeydown}
    >
      <input
        bind:this={inputEl}
        class="docs-search-input"
        type="search"
        placeholder={t('searchPlaceholder')}
        value={query}
        oninput={onInput}
        onkeydown={onKeydown}
        autocomplete="off"
        spellcheck="false"
      />
      <div class="docs-search-results">
        {#if query.trim() && results.length === 0 && !loading}
          <div class="docs-search-empty">{t('noResults')}</div>
        {:else if !query.trim()}
          <div class="docs-search-empty">{t('searchHint')}</div>
        {:else}
          <ul>
            {#each results as r, i (r.id)}
              <li>
                <button
                  type="button"
                  class="docs-search-result"
                  data-active={i === active ? 'true' : 'false'}
                  onmouseenter={() => (active = i)}
                  onclick={() => go(r)}
                >
                  <span class="docs-search-result-title">{r.title}</span>
                  {#if r.breadcrumb}
                    <span class="docs-search-result-crumb">{r.breadcrumb}</span>
                  {/if}
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>
  </div>
{/if}
