<script setup lang="ts">
import { ref } from 'vue';

interface CounterProps {
  count: number;
}

const props = defineProps<CounterProps>();

const count = ref(props.count);
</script>

<template>
  <div class="counter">
    <button @click="count--">−</button>
    <span class="count">{{ count }}</span>
    <button @click="count++">+</button>
  </div>
</template>

<style scoped>
.counter {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  line-height: 1em;
  padding: 16px 20px;
  border-radius: 16px 28px 16px 30px;
  font-size: 16px;
  border: 3px solid #4a4438;
  background: #f0f5ec;
  box-shadow: 3px 3px 0 rgba(74, 68, 56, 0.2);
}

.counter button {
  width: 2em;
  height: 2em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50% 48% 50% 52%;
  font-size: 1em;
  border: 2px solid #4a4438;
  outline: none;
  background: #fdfbf7;
  color: #2d2a24;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 2px 2px 0 rgba(74, 68, 56, 0.2);
  transition: all 0.1s ease;
  flex-shrink: 0;
}

.counter button:hover {
  background: #e8f0db;
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 rgba(74, 68, 56, 0.2);
}

.counter button:active {
  transform: translate(1px, 1px);
  box-shadow: none;
}

.counter .count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5em;
  text-align: center;
  padding: 4px 10px;
  font-weight: bold;
  font-size: 1em;
  color: #059669;
  border: 2px dashed rgba(74, 68, 56, 0.2);
  border-radius: 4px 8px 4px 10px;
  background: transparent;
}
</style>
