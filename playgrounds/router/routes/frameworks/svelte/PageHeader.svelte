<script lang="ts">
  let { title, description, children }: { title: string; description?: string; children?: import('svelte').Snippet } = $props();
</script>

<header class="ds-page-header">
  <h1>{title}</h1>
  {#if description}<p class="ds-description">{description}</p>{/if}
  {@render children?.()}
</header>
