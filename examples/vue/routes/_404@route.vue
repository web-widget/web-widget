<script setup lang="ts">
import { defineMeta } from '@web-widget/helpers';
import BaseLayout from './examples/(components)/BaseLayout.vue';
import ErrorPage from './examples/(components)/ErrorPage.vue';

defineOptions({
  meta: defineMeta({
    title: 'Not Found',
  }),
});
</script>

<template>
  <BaseLayout>
    <div class={shared.container}>
      <ErrorPage />
    </div>
  </BaseLayout>
</template>
