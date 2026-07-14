<script setup lang="ts">
const props = defineProps(['id']);
await new Promise((_, reject) =>
  setTimeout(() => reject(new Error(`Widget ${props.id} failed to load data`)), 500)
);
</script>

<template>
  <div></div>
</template>
