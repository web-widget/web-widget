<script setup lang="ts">
import BaseLayout from './BaseLayout.vue';
import { mergeMeta, defineMeta, defineRouteHandler } from '@web-widget/helpers';

type PageData = {
  message: string;
};

defineOptions({
  meta: defineMeta({
    title: 'Vue3: Server component',
  }),
  handler: defineRouteHandler<PageData>({
    async GET(ctx) {
      return ctx.html(
        {
          message: 'This is the server component of vue.',
        },
        {
          meta: mergeMeta(ctx.meta, {
            description: 'vue3 examples',
          }),
        }
      );
    },
  }),
});

const { data } = defineProps<{ data: PageData }>();
</script>

<template>
  <BaseLayout>
    <header class="ds-page-header">
      <h1>Vue3: Server component</h1>
      <p class="ds-description">A Vue 3 single-file component rendered on the server and hydrated on the client.</p>
    </header>
    <p class="data">{{ data }}</p>
  </BaseLayout>
</template>

<style>
.data {
  color: cadetblue;
}
</style>
