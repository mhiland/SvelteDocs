<script>
  let { locales = [], current, onChange, label } = $props()
</script>

{#if locales.length > 1}
  <label class="docs-field">
    <span class="docs-field-label">{label}</span>
    <select class="docs-select" onchange={(e) => onChange(e.currentTarget.value)}>
      {#each locales as l (l.code)}
        <option value={l.code} selected={l.code === current}>{l.label}</option>
      {/each}
    </select>
  </label>
{/if}
