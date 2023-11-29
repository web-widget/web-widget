<script setup lang="ts">
import { defineComponent, h } from "vue"
import BaseLayout from "../components/BaseLayout.vue";
import ReactWaitDemo from "../widgets/Wait.widget.jsx";
import VueWaitDemo from "../widgets/Wait.widget.vue";
const dev = import.meta.env.DEV;
// const Loading = defineComponent({
//   template: `<div style="background: #f3f3f3; padding: 20px">Loading..</div>`
// });
const Loading = h("div", { style: "background: #f3f3f3; padding: 20px" }, "Loading...");

</script>

<template>
  <BaseLayout>
    <h1>Vue Route: Streaming</h1>
    <p v-if="dev" style="background: yellow">
      💡 This example needs to run `pnpm start`
    </p>
    <VueWaitDemo :fallback="Loading" id="demo:0" />
    <hr />
    <VueWaitDemo :fallback="Loading" id="demo:1" />
    <hr />
    <VueWaitDemo :fallback="Loading" id="demo:2" />
    <hr />
    <ReactWaitDemo :fallback="Loading" id="demo:3" />
    <hr />
    <ReactWaitDemo :fallback="Loading" id="demo:4" />
    <hr />
    <ReactWaitDemo :fallback="Loading" id="demo:5" />
  </BaseLayout>
</template>
