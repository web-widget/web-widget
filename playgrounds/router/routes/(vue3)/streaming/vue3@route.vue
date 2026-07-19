<script setup lang="ts">
import { h } from 'vue';
import { defineRouteHandler } from '@web-widget/helpers';
import '../../(css)/demo-states.css';
import BaseLayout from '../BaseLayout.vue';
import ReactWaitDemo from '../../(components)/Wait@widget.jsx';
import VueFailDemo from '../Fail@widget.vue';
import VueWaitDemo from '../Wait@widget.vue';

const Pending = h(
  'div',
  { class: 'demo-loading' },
  'Pending: loading content...'
);
const ErrorFallback = h(
  'div',
  { class: 'demo-error' },
  'Error: content failed to load.'
);

defineOptions({
  handler: defineRouteHandler({
    async GET(ctx) {
      return ctx.html(undefined, { renderer: { progressive: true } });
    },
  }),
});
</script>

<template>
  <BaseLayout>
    <header class="ds-page-header">
      <h1>Vue 3: Progressive streaming</h1>
      <p class="ds-description">
        Pending UI is sent immediately, then replaced by resolved content or an
        error message as asynchronous work settles.
      </p>
    </header>
    <section class="ds-section">
      <h2>Multiple pending items are replaced in completion order</h2>
      <p class="ds-description">
        Each loading state appears immediately; results are streamed into their
        own positions as each request completes.
      </p>
      <VueWaitDemo :widget="{ fallback: Pending }" id="Vue 3 Widget 1" />
      <ReactWaitDemo :widget="{ fallback: Pending }" id="React Widget 2" />
      <VueWaitDemo :widget="{ fallback: Pending }" id="Vue 3 Widget 3" />
    </section>
    <section class="ds-section">
      <h2>Pending content is replaced when rendering fails</h2>
      <p class="ds-description">
        The loading state appears first, then the error message recovers this
        section.
      </p>
      <VueFailDemo
        :widget="{ fallback: { pending: Pending, error: ErrorFallback } }"
        id="vue3:error" />
    </section>
  </BaseLayout>
</template>
