<script lang="ts">
  import type { Snippet } from 'svelte';
  import '~/routes/(css)/base-layout.css';
  import '~/routes/(css)/ui.css';
  import Menu from './Menu.svelte';

  let { children }: { children: Snippet } = $props();

  const activeMenuScript = `<script>(function(){var p=location.pathname;document.querySelectorAll('aside a[href]').forEach(function(a){if(a.getAttribute('href')===p)a.setAttribute('aria-current','page')})})();<\/script>`;
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
{@html activeMenuScript}
