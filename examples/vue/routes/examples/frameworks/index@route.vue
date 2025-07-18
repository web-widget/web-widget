<script setup lang="ts">
import { defineMeta } from '@web-widget/helpers';
import ReactCounter from '../(components)/Counter@widget.tsx';
import BaseLayout from '../(components)/BaseLayout.vue';
import EditButton from '../(components)/EditButton@widget.vue';
import VueCounter from '../(components)/Counter@widget.vue';
import shared from '../(components)/shared.module.css';

const currentFileUrl = import.meta.url;

defineOptions({
  meta: defineMeta({
    title: 'Widgets - Web Widget',
  }),
});
</script>

<template>
  <BaseLayout>
    <div :class="shared.container">
      <h1 :class="shared.pageTitle">🍀 Widgets</h1>

      <div :class="`${shared.highlight} ${shared.info}`">
        <h2>React and Vue components collaborate on the same page</h2>
        <p>
          One of Web Widget's core features is supporting multiple frontend
          frameworks to coexist seamlessly in the same application. The
          following demo shows how React and Vue components can work together
          on the same page.
        </p>
      </div>

      <div :class="shared.mb6">
        <h3 :class="shared.sectionTitle">Framework Coexistence Demo</h3>
        <div :class="`${shared.grid} ${shared.grid2}`">
          <div :class="shared.card">
            <h4 :class="shared.cardTitle">React Counter</h4>
            <p :class="shared.cardDescription">
              Counter component implemented with React 19 and modern Hooks
            </p>
            <div :class="shared.mt3">
              <ReactCounter :count="0" variant="react" />
            </div>
          </div>

          <div :class="shared.card">
            <h4 :class="shared.cardTitle">Vue Counter</h4>
            <p :class="shared.cardDescription">
              Counter component implemented with Vue 3 Composition API
            </p>
            <div :class="shared.mt3">
              <VueCounter :count="0" variant="vue" />
            </div>
          </div>
        </div>
      </div>

      <div :class="shared.mb6">
        <h3 :class="shared.sectionTitle">Technical Features</h3>
        <div :class="`${shared.grid} ${shared.grid3}`">
          <div :class="shared.card">
            <div :class="shared.cardIcon">🔄</div>
            <h4 :class="shared.cardTitle">Interoperability</h4>
            <p :class="shared.cardDescription">
              Components from different tech stacks can seamlessly integrate
              with each other through automatic conversion
            </p>
          </div>
          <div :class="shared.card">
            <div :class="shared.cardIcon">⚡</div>
            <h4 :class="shared.cardTitle">Isomorphic Rendering</h4>
            <p :class="shared.cardDescription">
              Components from both frameworks support server-side rendering
              and client-side hydration
            </p>
          </div>
          <div :class="shared.card">
            <div :class="shared.cardIcon">🔒</div>
            <h4 :class="shared.cardTitle">Type Safe</h4>
            <p :class="shared.cardDescription">
              TypeScript type definitions ensure type safety for
              cross-framework component calls
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit button - only shown in development -->
    <EditButton :currentFileUrl="currentFileUrl" />
  </BaseLayout>
</template>