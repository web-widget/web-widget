<script setup lang="ts">
import { h } from 'vue';
import { defineRouteHandler } from '@web-widget/helpers';
import '../(css)/demo-states.css';
import BaseLayout from './BaseLayout.vue';
import ReactWaitDemo from '../(components)/Wait@widget.jsx';
import VueWaitDemo from './Wait@widget.vue';

const Loading = h('div', { class: 'demo-loading' }, 'Loading...');

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
      <h1>Vue3: Streaming</h1>
      <p class="ds-description">
        Stream Vue 3 content progressively with Suspense — slow async components
        render as they resolve without blocking the page.
      </p>
    </header>
    <VueWaitDemo :widget="{ fallback: Loading }" id="demo:0" />
    <VueWaitDemo :widget="{ fallback: Loading }" id="demo:1" />
    <VueWaitDemo :widget="{ fallback: Loading }" id="demo:2" />
    <ReactWaitDemo :widget="{ fallback: Loading }" id="demo:3" />
    <ReactWaitDemo :widget="{ fallback: Loading }" id="demo:4" />
    <ReactWaitDemo :widget="{ fallback: Loading }" id="demo:5" />
  </BaseLayout>
</template>
