<script setup lang="ts">
import { h } from 'vue';
import { defineRouteHandler } from '@web-widget/helpers';
import '../../(css)/demo-states.css';
import BaseLayout from '../BaseLayout.vue';
import VueWaitDemo from '../Wait@widget.vue';
import VueFailDemo from '../Fail@widget.vue';

const Loading = h('div', { class: 'demo-loading' }, 'Loading..');
const ErrorFallback = h(
  'div',
  { class: 'demo-error' },
  'Widget failed to render (error recovered)'
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
      <h1>Vue3: Streaming error</h1>
      <p class="ds-description">
        This page demonstrates streaming SSR error recovery. The failing widget
        is wrapped in an onErrorCaptured boundary so the rest of the page stays
        functional.
      </p>
    </header>

    <section class="ds-section">
      <h2>Normal widget (succeeds)</h2>
      <VueWaitDemo :widget="{ fallback: Loading }" id="ok:0" />
    </section>

    <section class="ds-section">
      <h2>Failing widget with differentiated fallback (loading vs error)</h2>
      <VueFailDemo
        :widget="{ fallback: { pending: Loading, error: ErrorFallback } }"
        id="fail:0" />
    </section>

    <section class="ds-section">
      <h2>Another normal widget after the failure</h2>
      <VueWaitDemo :widget="{ fallback: Loading }" id="ok:1" />
    </section>
  </BaseLayout>
</template>
