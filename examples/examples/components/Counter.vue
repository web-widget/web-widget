<script setup lang="ts">
import { ref } from 'vue';
const props = defineProps(['name', 'start']);

const name = props.name;
const count = ref(props.start);
</script>

<template>
  <div class="box">
    <h3>{{ name }}</h3>
      <p>{{ count }}</p>
      <button @click="count--">
        -1
      </button>
      <button @click="count++">
        +1
      </button>
  </div>
</template>

<style scoped>
  .box {
    display: inline-block;
    border:1px solid cadetblue;
  }
</style>