<script setup lang="ts">
import BaseLayout from './BaseLayout.vue';
import { mergeMeta, defineMeta, defineRouteHandler } from '@web-widget/vue';

type PageData = {
  message: string;
};

defineOptions({
  meta: defineMeta({
    title: 'Vue3: Server component',
  }),
  handler: defineRouteHandler<PageData>({
    async GET(ctx) {
      return ctx.render({
        data: {
          message: 'This is the server component of vue.',
        } as PageData,
        meta: mergeMeta(ctx.meta, {
          description: 'vue3 examples',
        }),
      });
    },
  }),
});

const { data } = defineProps<{ data: PageData }>();
</script>

<template>
  <BaseLayout>
    <h1>Vue3: Server component</h1>
    <p class="data">{{ data }}</p>
  </BaseLayout>
</template>

<style>
.data {
  color: cadetblue;
}
</style>
