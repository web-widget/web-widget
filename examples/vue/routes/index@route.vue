<script setup lang="ts">
import { defineMeta } from '@web-widget/vue';
import BaseLayout from './(components)/BaseLayout.vue';
import ReactCounter from './(components)/Counter@widget.tsx';
import VueCounter from './(components)/Counter@widget.vue';

defineOptions({
  meta: defineMeta({
    title: 'Home - Web Widget',
  }),
});
</script>

<template>
  <BaseLayout>
    <h1>Welcome to Web Widget.</h1>
    <p>Try to update this message in the <code>./routes/index@route.vue</code> file.</p>

    <h2>React</h2>
    <ReactCounter .count="0" />

    <h2>Vue</h2>
    <VueCounter .count="0" />
  </BaseLayout>
</template>