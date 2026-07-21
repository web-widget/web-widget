<script setup lang="ts">
import { ref } from 'vue';
import styles from '~/routes/(css)/counter.module.css';

const props = defineProps({ count: { type: Number, default: 0 } });
const count = ref(props.count);
const buttonClass = styles.button;
</script>

<template>
  <button :class="buttonClass" @click="count += 1">
    Vue 2 count is {{ count }}
  </button>
</template>

<style scoped>
button {
  --vue-scoped-owner: vue2;
  --vue-scoped-version: 1;
}
</style>
