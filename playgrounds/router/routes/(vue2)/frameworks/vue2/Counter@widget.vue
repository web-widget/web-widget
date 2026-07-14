<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps({ count: { type: Number, default: 0 } });
const count = ref(props.count);
</script>

<template>
  <button @click="count += 1">Vue 2 count is {{ count }}</button>
</template>
