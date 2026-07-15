<script context="module" lang="ts">
  import { defineMeta } from '@web-widget/helpers';
  export const meta = defineMeta({ title: 'Svelte Widget embedding' });
</script>

<script lang="ts">
  import { container } from '@web-widget/svelte/adapter';
  import Layout from './Layout.svelte';

  const Vue2Counter = container(
    () =>
      import(
        '@playgrounds/web-router-vue2/frameworks/vue2/Counter@widget.vue'
      )
  );
</script>

<Layout>
  <header class="ds-page-header">
    <h1>Svelte Widget embedding</h1>
    <p class="ds-description">A Vue 2 Widget embedded through the Svelte container.</p>
  </header>
  <section class="ds-section">
    <h2>Vue 2 counter</h2>
    <Vue2Counter count={3} />
  </section>
</Layout>
