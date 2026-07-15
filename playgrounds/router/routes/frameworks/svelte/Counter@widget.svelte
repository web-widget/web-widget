<script lang="ts">
  let { count = 0 }: { count?: number } = $props();
</script>

<button onclick={() => count += 1}>Svelte count is {count}</button>
