<script setup lang="ts">
import { ref } from 'vue';
const props = defineProps(['count']);

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
  display: inline-block;
  line-height: 1em;
  padding: 15px;
  border-radius: 30px;
  font-size: 16px;
  border: 2px solid #42b883;
}
.counter button {
  width: 2em;
  height: 2em;
  line-height: 2em;
  text-align: center;
  border-radius: 100%;
  font-size: 1em;
  border: 0 none;
  outline: #fff solid 5px;
  background: #42b883;
  color: #fff;
  font-weight: bold;
  cursor: pointer;
}
.counter .count {
  display: inline-block;
  min-width: 1.2em;
  text-align: center;
  padding-left: 10px;
  padding-right: 10px;
  font-weight: bold;
  font-size: 1em;
  color: #42b883;
  border: 1px solid transparent;
  background: transparent;
}
</style>
