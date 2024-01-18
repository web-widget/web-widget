<script lang="ts">
import BaseLayout from "./BaseLayout.vue";
import { mergeMeta } from "@web-widget/vue2";
import type { RouteModule } from "@web-widget/vue2";

type PageData = {
  message: string
};

export default {
  ...({
    meta: {
      title: "Vue2: Server component"
    },
    handler: {
      async GET(ctx) {
        return ctx.render({
          data: {
            message: "This is the server component of vue."
          } as PageData,
          meta: mergeMeta(ctx.meta, {
            description: "vue2 examples"
          })
        });
      }
    }
  } as RouteModule),
}
</script>

<script setup lang="ts">
const props = defineProps({
  data: Object
});
</script>

<template>
  <BaseLayout>
    <h1>Vue2: Server component</h1>
    <p class="data">{{ props.data }}</p>
  </BaseLayout>
</template>

<style>
.data { color: cadetblue; }
</style>