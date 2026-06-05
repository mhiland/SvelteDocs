<script>
  // page.html is sanitized at BUILD time (rehype-sanitize, no allowDangerousHtml)
  // and is first-party content, so {@html} is the right tool here.
  let { page, t, showFallback = false } = $props()
</script>

<article class="docs-article">
  {#if page}
    <h1 class="docs-title">{page.title}</h1>
    {#if showFallback}
      <div class="docs-fallback-notice" role="note">{t('fallbackNotice')}</div>
    {/if}
    <div class="docs-content">
      {@html page.html}
    </div>
  {:else}
    <h1 class="docs-title">{t('notFound')}</h1>
    <p>{t('notFoundBody')}</p>
  {/if}
</article>
