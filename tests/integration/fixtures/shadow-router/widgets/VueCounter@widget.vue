<script setup lang="ts">
import { ref } from 'vue';
import styles from '~/styles/counter.module.css';

const props = withDefaults(defineProps<{ count?: number }>(), { count: 0 });
const count = ref(props.count);
</script>

<template>
  <button :class="styles.button" @click="count += 1">
    Vue 3 count is {{ count }}
  </button>
</template>

<style scoped>
button {
  --vue-scoped-owner: vue3;
  --vue-scoped-version: 1;
}
</style>
