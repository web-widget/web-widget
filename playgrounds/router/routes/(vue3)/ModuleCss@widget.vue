<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  count: number;
}

const props = defineProps<Props>();
const count = ref(props.count);
</script>

<template>
  <div :class="$style.box">
    <button :class="$style.btn" @click="count--">−</button>
    <span :class="$style.count">{{ count }}</span>
    <button :class="$style.btn" @click="count++">+</button>
  </div>
</template>

<style module>
.box {
  display: inline-block;
  line-height: 1em;
  padding: 20px;
  border-radius: 30px;
  font-size: 16px;
  background: linear-gradient(315deg, #42d392 25%, #647eff);
}

.btn {
  width: 2em;
  height: 2em;
  line-height: 2em;
  text-align: center;
  border-radius: 100%;
  font-size: 1em;
  border: 0 none;
  outline: #fff solid 5px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-weight: bold;
  cursor: pointer;
}

.count {
  display: inline-block;
  min-width: 1.5em;
  text-align: center;
  padding-left: 10px;
  padding-right: 10px;
  font-weight: bold;
  font-size: 1em;
  color: #fff;
  background: transparent;
}
</style>
