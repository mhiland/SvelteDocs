<script>
  let { nav = [], currentUrl } = $props()
  let open = $state({})

  // Default every category open; default-open is fine for a small doc set and
  // also guarantees the active page's category is visible.
  $effect(() => {
    for (const n of nav) if (n.type === 'category' && !(n.slug in open)) open[n.slug] = true
  })
</script>

<nav class="docs-sidebar" aria-label="Documentation">
  <ul class="docs-sidebar-list">
    {#each nav as node (node.slug)}
      {#if node.type === 'page'}
        <li>
          <a
            href={node.url}
            class="docs-sidebar-link"
            aria-current={node.url === currentUrl ? 'page' : undefined}>{node.title}</a
          >
        </li>
      {:else}
        <li class="docs-sidebar-cat">
          <button
            type="button"
            class="docs-sidebar-cat-btn"
            aria-expanded={open[node.slug] ? 'true' : 'false'}
            onclick={() => (open[node.slug] = !open[node.slug])}
          >
            <span class="docs-caret" data-open={open[node.slug] ? 'true' : 'false'}>▸</span>
            {node.title}
          </button>
          {#if open[node.slug]}
            <ul class="docs-sidebar-sublist">
              {#each node.children as child (child.slug)}
                <li>
                  <a
                    href={child.url}
                    class="docs-sidebar-link"
                    aria-current={child.url === currentUrl ? 'page' : undefined}>{child.title}</a
                  >
                </li>
              {/each}
            </ul>
          {/if}
        </li>
      {/if}
    {/each}
  </ul>
</nav>
