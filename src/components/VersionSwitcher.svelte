<script>
  let { versions = [], current, onChange, label } = $props()
</script>

{#if versions.length > 1}
  <label class="docs-field">
    <span class="docs-field-label">{label}</span>
    <select class="docs-select" onchange={(e) => onChange(e.currentTarget.value)}>
      {#each versions as v (v.slug)}
        <option value={v.slug} selected={v.slug === current}>{v.label}</option>
      {/each}
    </select>
  </label>
{/if}
