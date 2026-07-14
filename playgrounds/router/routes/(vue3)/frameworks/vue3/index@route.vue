<script setup lang="ts">
import { defineMeta } from '@web-widget/helpers';
import { container } from '@web-widget/vue/adapter';
import Counter from './Counter@widget.vue';
import BaseLayout from '../../BaseLayout.vue';

const ReactCounter = container(
  () => import('../../../frameworks/react/Counter@widget')
);
const Vue2Counter = container(
  () => import('../../../(vue2)/frameworks/vue2/Counter@widget.vue')
);
const SvelteCounter = container(
  () => import('../../../frameworks/svelte/Counter@widget.svelte')
);
const SolidCounter = container(
  () => import('../../../frameworks/solid/Counter@widget.solid')
);
const PreactCounter = container(
  () => import('../../../frameworks/preact/Counter@widget.preact')
);
const WebComponentCounter = container<{ count?: number }>(
  () => import('../../../(components)/WebComponentCounter@widget.wc')
);
const LitCounter = container<{ count?: number }>(
  () => import('../../../(components)/LitCounter@widget.lit')
);

defineOptions({ meta: defineMeta({ title: 'Vue 3 route' }) });
</script>

<template>
  <BaseLayout>
    <header class="ds-page-header">
      <h1>Vue 3 route</h1>
      <p class="ds-description">
        A Vue 3 route importing a Vue 3 component, rendered on the server and
        hydrated in the browser.
      </p>
    </header>
    <section class="ds-section">
      <h2>Native Widget</h2>
      <Counter :count="3" />
    </section>
    <section class="ds-section">
      <h2>Widgets from other frameworks</h2>
      <h3>React Widget</h3>
      <ReactCounter :count="3" />
      <h3>Vue 2 Widget</h3>
      <Vue2Counter :count="3" />
      <h3>Svelte Widget</h3>
      <SvelteCounter :count="3" />
      <h3>Solid Widget</h3>
      <SolidCounter :count="3" />
      <h3>Preact Widget</h3>
      <PreactCounter :count="3" />
      <h3>Web Components Widget</h3>
      <WebComponentCounter :widget="{ clientOnly: true }" :count="3" />
      <h3>Lit Widget</h3>
      <LitCounter :widget="{ clientOnly: true }" :count="3" />
    </section>
  </BaseLayout>
</template>
