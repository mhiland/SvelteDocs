<script>
  let { versions = [], current, onChange, label } = $props()
</script>

{#if versions.length > 1}
  <select class="docs-select" aria-label={label} onchange={(e) => onChange(e.currentTarget.value)}>
    {#each versions as v (v.slug)}
      <option value={v.slug} selected={v.slug === current}>{v.label}</option>
    {/each}
  </select>
{/if}
