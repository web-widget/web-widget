<script setup lang="ts">
import BaseLayout from "../components/BaseLayout.vue"
import ReactCounter from "../widgets/Counter.widget";
</script>

<template>
  <BaseLayout>
    <h1>Vue: Server component</h1>
    <p>This is the server component of vue.</p>
    <div><ReactCounter name="Vanilla Counter" :start="3" /></div>
  </BaseLayout>
</template>
