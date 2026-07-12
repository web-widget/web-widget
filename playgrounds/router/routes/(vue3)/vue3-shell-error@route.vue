<script setup lang="ts">
import BaseLayout from './BaseLayout.vue';

// Shell error: thrown during setup, outside any onErrorCaptured boundary.
// renderToWebStream errors → the framework returns a 500 response.
throw new Error('Shell error: rendering failed before any suspense boundary');
</script>

<template>
  <BaseLayout>
    <h1>This should never render</h1>
  </BaseLayout>
</template>
