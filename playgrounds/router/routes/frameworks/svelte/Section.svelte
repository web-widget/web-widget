<script lang="ts">
  let { title, description, children }: { title: string; description?: string; children: import('svelte').Snippet } = $props();
</script>

<section class="ds-section">
  <h2>{title}</h2>
  {#if description}<p class="ds-description">{description}</p>{/if}
  {@render children()}
</section>
