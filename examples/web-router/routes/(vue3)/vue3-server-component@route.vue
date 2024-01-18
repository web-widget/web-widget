<script setup lang="ts">
import BaseLayout from "./BaseLayout.vue";
import type { RouteComponentProps, RouteModule } from "@web-widget/vue";
import { mergeMeta } from "@web-widget/vue";

type PageData = {
  message: string
};

defineOptions({
  meta: {
    title: "Vue3: Server component"
  },
  handler: {
    async GET(ctx) {
      return ctx.render({
        data: {
          message: "This is the server component of vue."
        } as PageData,
        meta: mergeMeta(ctx.meta, {
          description: "vue3 examples"
        })
      });
    }
  }
} as RouteModule);

const { data } = defineProps<RouteComponentProps<PageData>>();
</script>

<template>
  <BaseLayout>
    <h1>Vue3: Server component</h1>
    <p class="data">{{ data }}</p>
  </BaseLayout>
</template>

<style>
.data { color: cadetblue; }
</style>