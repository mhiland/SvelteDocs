<script>
  let { toc = [], t } = $props()
  let activeId = $state('')

  // Scroll-spy: highlight the heading nearest the top of the viewport. Re-runs
  // when `toc` changes (i.e. on navigation), re-observing the new headings.
  $effect(() => {
    if (!toc.length || typeof IntersectionObserver === 'undefined') return
    const headings = toc.map((i) => document.getElementById(i.id)).filter(Boolean)
    if (!headings.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length) activeId = visible[0].target.id
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 },
    )
    headings.forEach((h) => observer.observe(h))
    return () => observer.disconnect()
  })
</script>

{#if toc.length}
  <nav class="docs-toc" aria-label={t('onThisPage')}>
    <div class="docs-toc-title">{t('onThisPage')}</div>
    <ul class="docs-toc-list">
      {#each toc as item (item.id)}
        <li class="docs-toc-item docs-toc-d{item.depth}">
          <a
            href={`#${item.id}`}
            class:active={item.id === activeId}
            aria-current={item.id === activeId ? 'true' : undefined}>{item.text}</a
          >
        </li>
      {/each}
    </ul>
  </nav>
{/if}
