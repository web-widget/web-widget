<script lang="ts">
import { defineMeta, defineRouteFallbackComponent } from '@web-widget/helpers';
import BaseLayout from './examples/(components)/BaseLayout.vue';
import ErrorPage from './examples/(components)/ErrorPage.vue';
import shared from './examples/(components)/shared.module.css';
import { h } from 'vue';

export const meta = defineMeta({
  title: 'Not Found',
});

export const fallback = defineRouteFallbackComponent(function Page() {
  return h(BaseLayout, {}, [
    h('div', { class: shared.container }, [
      h(ErrorPage)
    ])
  ]);
});
</script>

<template>
  <!-- This route uses the fallback component defined above -->
</template>
