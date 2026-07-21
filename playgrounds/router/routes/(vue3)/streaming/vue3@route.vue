<script setup lang="ts">
import { h } from 'vue';
import { defineRouteHandler } from '@web-widget/helpers';
import '~/routes/(css)/demo-states.css';
import BaseLayout from '../BaseLayout.vue';
import ReactWaitDemo from '~/routes/(components)/Wait@widget.jsx';
import VueFailDemo from '../Fail@widget.vue';
import VueWaitDemo from '../Wait@widget.vue';
import PageHeader from '../PageHeader.vue';
import Section from '../Section.vue';

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
    <PageHeader
      title="Vue 3: Progressive streaming"
      description="Pending UI is sent immediately, then replaced by resolved content or an error message as asynchronous work settles." />
    <Section
      title="Multiple pending items are replaced in completion order"
      description="Each loading state appears immediately; results are streamed into their own positions as each request completes.">
      <VueWaitDemo :widget="{ fallback: Pending }" id="Vue 3 Widget 1" />
      <ReactWaitDemo :widget="{ fallback: Pending }" id="React Widget 2" />
      <VueWaitDemo :widget="{ fallback: Pending }" id="Vue 3 Widget 3" />
    </Section>
    <Section
      title="Pending content is replaced when rendering fails"
      description="The loading state appears first, then the error message recovers this section.">
      <VueFailDemo
        :widget="{ fallback: { pending: Pending, error: ErrorFallback } }"
        id="vue3:error" />
    </Section>
  </BaseLayout>
</template>
