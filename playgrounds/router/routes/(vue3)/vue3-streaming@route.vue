<script setup lang="ts">
import { h } from 'vue';
import BaseLayout from './BaseLayout.vue';
import ReactWaitDemo from '../(components)/Wait@widget.jsx';
import VueWaitDemo from './Wait@widget.vue';
const dev = import.meta.env.DEV;
// const Loading = defineComponent({
//   template: `<div style="background: #f3f3f3; padding: 20px">Loading..</div>`
// });
const Loading = h(
  'div',
  { style: 'background: #f3f3f3; padding: 20px' },
  'Loading...'
);
</script>

<template>
  <BaseLayout>
    <h1>Vue3 Route: Streaming</h1>
    <VueWaitDemo :widget="{ fallback: Loading }" id="demo:0" />
    <hr />
    <VueWaitDemo :widget="{ fallback: Loading }" id="demo:1" />
    <hr />
    <VueWaitDemo :widget="{ fallback: Loading }" id="demo:2" />
    <hr />
    <ReactWaitDemo :widget="{ fallback: Loading }" id="demo:3" />
    <hr />
    <ReactWaitDemo :widget="{ fallback: Loading }" id="demo:4" />
    <hr />
    <ReactWaitDemo :widget="{ fallback: Loading }" id="demo:5" />
  </BaseLayout>
</template>
