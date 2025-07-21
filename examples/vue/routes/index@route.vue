<script setup lang="ts">
import { defineRouteHandler } from '@web-widget/helpers';
import { redirect } from '@web-widget/helpers/navigation';

defineOptions({
  handler: defineRouteHandler({
    async GET() {
      return redirect('/examples');
    },
  }),
});
</script>

<template>
  <!-- This route redirects to /examples, so no template content is needed -->
</template>