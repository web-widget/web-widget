<script lang="ts">
  import type { Snippet } from 'svelte';
  import '~/routes/(css)/base-layout.css';
  import '~/routes/(css)/ui.css';
  import Menu from './Menu.svelte';
  import { menuEnhancementScript } from '../menu-client';

  let { children }: { children: Snippet } = $props();

  const enhancementScript = `<script>${menuEnhancementScript}<\/script>`;
</script>

<header class="site-header">
  <h1>Web Router Playground</h1>
</header>
<div class="container">
  <aside data-playground-menu>
    <Menu />
  </aside>
  <main>{@render children()}</main>
</div>
<footer>
  <p>This is a footer</p>
</footer>
{@html enhancementScript}
