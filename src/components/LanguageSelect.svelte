<script>
  let { locales = [], current, onChange, label } = $props()
</script>

{#if locales.length > 1}
  <select class="docs-select" aria-label={label} onchange={(e) => onChange(e.currentTarget.value)}>
    {#each locales as l (l.code)}
      <option value={l.code} selected={l.code === current}>{l.label}</option>
    {/each}
  </select>
{/if}
