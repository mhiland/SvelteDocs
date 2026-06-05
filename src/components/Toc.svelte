<script>
  let { toc = [], t } = $props()
</script>

{#if toc.length}
  <nav class="docs-toc" aria-label={t('onThisPage')}>
    <div class="docs-toc-title">{t('onThisPage')}</div>
    <ul class="docs-toc-list">
      {#each toc as item (item.id)}
        <li class="docs-toc-item docs-toc-d{item.depth}">
          <a href={`#${item.id}`}>{item.text}</a>
        </li>
      {/each}
    </ul>
  </nav>
{/if}
