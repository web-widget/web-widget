<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import '~/routes/(css)/base-layout.css';
  import '~/routes/(css)/ui.css';
  import Menu from './Menu.svelte';

  let { children }: { children: Snippet } = $props();

  onMount(() => {
    const path = location.pathname;
    document.querySelectorAll('aside a[href]').forEach((anchor) => {
      if (anchor.getAttribute('href') === path) anchor.setAttribute('aria-current', 'page');
    });
  });
</script>

<header class="site-header">
  <h1>Web Router Playground</h1>
</header>
<div class="container">
  <aside>
    <Menu />
  </aside>
  <main>{@render children()}</main>
</div>
<footer>
  <p>This is a footer</p>
</footer>
