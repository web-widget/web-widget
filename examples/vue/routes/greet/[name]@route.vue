<script setup lang="ts">
import { defineMeta } from '@web-widget/helpers';
import BaseLayout from '../(components)/BaseLayout.vue';

interface Params {
  name: string;
}

defineOptions({
  meta: defineMeta({
    title: 'Dynamic routes - Web Widget',
  }),
});

const { params } = defineProps<{ params: Params }>();
</script>

<template>
  <BaseLayout>
    <h1>Dynamic routes</h1>
    <p>Greetings to you, {{ params.name }}!</p>
    <p>
      <a href="/greet/react">react</a>
    </p>
    <p>
      <a href="/greet/vue">vue</a>
    </p>
  </BaseLayout>
</template>