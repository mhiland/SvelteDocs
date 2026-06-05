<script>
  let { prev, next, t } = $props()
</script>

{#if prev || next}
  <nav class="docs-prevnext" aria-label="Pagination">
    {#if prev}
      <a class="docs-prevnext-link docs-prev" href={prev.url}>
        <span class="docs-prevnext-dir">{t('previous')}</span>
        <strong class="docs-prevnext-title">{prev.title}</strong>
      </a>
    {:else}
      <span></span>
    {/if}
    {#if next}
      <a class="docs-prevnext-link docs-next" href={next.url}>
        <span class="docs-prevnext-dir">{t('next')}</span>
        <strong class="docs-prevnext-title">{next.title}</strong>
      </a>
    {/if}
  </nav>
{/if}
