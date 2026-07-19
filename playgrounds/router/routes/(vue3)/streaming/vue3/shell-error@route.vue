<script setup lang="ts">
import { defineRouteHandler } from '@web-widget/helpers';

defineOptions({
  handler: defineRouteHandler({
    async GET(ctx) {
      return ctx.html(undefined, { renderer: { progressive: true } });
    },
  }),
});

// This throw happens before a Suspense boundary can emit its shell.
throw new Error('Shell error: rendering failed before any suspense boundary');
</script>

<template><h1>This should never render</h1></template>
