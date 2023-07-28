<script setup lang="ts">
import { ref } from 'vue';
const props = defineProps(['name', 'start']);

const name = props.name;
const count = ref(props.start);
</script>

<template>
  <div>
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
