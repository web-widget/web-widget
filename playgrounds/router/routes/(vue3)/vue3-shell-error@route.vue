<script setup lang="ts">
import { defineRouteHandler } from '@web-widget/helpers';
import BaseLayout from './BaseLayout.vue';

defineOptions({
  handler: defineRouteHandler({
    async GET(ctx) {
      return ctx.html(undefined, { renderer: { progressive: true } });
    },
  }),
});

// Shell error: thrown during setup, outside any onErrorCaptured boundary.
// renderToWebStream errors → the framework returns a 500 response.
throw new Error('Shell error: rendering failed before any suspense boundary');
</script>

<template>
  <BaseLayout>
    <h1>This should never render</h1>
  </BaseLayout>
</template>
