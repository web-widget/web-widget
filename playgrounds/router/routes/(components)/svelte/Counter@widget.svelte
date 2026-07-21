<script lang="ts">
  import styles from '~/routes/(css)/counter.module.css';

  let { count = 0 }: { count?: number } = $props();
</script>

<button class={styles.button} onclick={() => count += 1}>Svelte count is {count}</button>
