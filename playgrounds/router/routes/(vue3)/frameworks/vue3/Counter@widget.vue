<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(defineProps<{ count?: number }>(), { count: 0 });
const count = ref(props.count);
</script>

<template>
  <button @click="count += 1">Vue 3 count is {{ count }}</button>
</template>
