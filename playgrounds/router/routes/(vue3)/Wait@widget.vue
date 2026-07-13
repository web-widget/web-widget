<script setup lang="ts">
import { ref } from 'vue';
const props = defineProps(['id']);

const random = (max: number, min: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);
const fetchData = async (timeout = random(900, 2900)) =>
  await new Promise((resolve) =>
    setTimeout(() => resolve(`Hello World`), timeout)
  );
const data = (await fetchData()) as string;
</script>

<template>
  <div class="demo-result">Vue {{ id }}: {{ data }}</div>
</template>
