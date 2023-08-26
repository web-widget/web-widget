<script setup lang="ts">
import { ref } from 'vue';
const props = defineProps(['id']);

const random = (max: number, min: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);
const fetchData = async (timeout = random(900, 2900)) =>
  await new Promise((resolve) =>
    setTimeout(() => resolve(`Hello Wrold`), timeout)
  );
const data = (await fetchData()) as string;
</script>

<template>
  <div class="box">
    Vue {{id}}: {{data}}
  </div>
</template>

<style scoped>
  .box {
    background: linear-gradient(315deg,#42d392 25%,#647eff);
    color: #FFF;
    padding: 20px;
  }
</style>