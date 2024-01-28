<script setup lang="ts">
import { onServerPrefetch, ref } from 'vue';
defineProps(['id']);

const random = (max: number, min: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);
const fetchData = async (timeout = random(900, 2900)): Promise<string> =>
  await new Promise((resolve) =>
    setTimeout(() => resolve(`Hello World`), timeout)
  );

const data = ref('Hello World');
onServerPrefetch(async () => {
  data.value = await fetchData();
});
</script>

<template>
  <div class="box">Vue {{ id }}: {{ data }}</div>
</template>

<style scoped>
.box {
  background: linear-gradient(315deg, #42d392 25%, #647eff);
  color: #fff;
  padding: 20px;
}
</style>
