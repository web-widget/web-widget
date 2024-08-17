<script lang="ts">
import BaseLayout from './BaseLayout.vue';
import { mergeMeta, defineMeta, defineRouteHandler } from '@web-widget/vue2';

type PageData = {
  message: string;
};

export default {
  ...{
    meta: defineMeta({
      title: 'Vue2: Server component',
    }),
    handler: defineRouteHandler<PageData>({
      async GET(ctx) {
        return ctx.render({
          data: {
            message: 'This is the server component of vue.',
          },
          meta: mergeMeta(ctx.meta, {
            description: 'vue2 examples',
          }),
        });
      },
    }),
  },
};
</script>

<script setup lang="ts">
const props = defineProps({
  data: Object,
});
</script>

<template>
  <BaseLayout>
    <h1>Vue2: Server component</h1>
    <p class="data">{{ props.data }}</p>
  </BaseLayout>
</template>

<style>
.data {
  color: cadetblue;
}
</style>
