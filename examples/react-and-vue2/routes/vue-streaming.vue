<script setup lang="ts">
import BaseLayout from "../components/BaseLayout.vue";
import ReactWaitDemo from "../widgets/Wait.jsx";
import VueWaitDemo from "../widgets/Wait.vue";
const dev = import.meta.env.DEV;
</script>

<template>
  <BaseLayout>
    <h1>Vue: Streaming</h1>
    <p v-if="dev" style="background: yellow">
      💡 This example needs to run `pnpm start`
    </p>
    <VueWaitDemo fallback={Loading} id="demo:0" />
    <hr />
    <VueWaitDemo fallback={Loading} id="demo:1" />
    <hr />
    <VueWaitDemo fallback={Loading} id="demo:2" />
    <hr />
    <ReactWaitDemo fallback={Loading} id="demo:3" />
    <hr />
    <ReactWaitDemo fallback={Loading} id="demo:4" />
    <hr />
    <ReactWaitDemo fallback={Loading} id="demo:5" />
  </BaseLayout>
</template>
