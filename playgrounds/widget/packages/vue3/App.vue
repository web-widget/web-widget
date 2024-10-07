<script setup lang="ts">
import ReactCounter from '@playgrounds/widget-react/Counter@widget.tsx';
import VueCounter from './Counter@widget.vue';
import Vue2Counter from '@playgrounds/widget-vue2/Counter@widget.vue';
import { ref } from 'vue';

defineProps({
  msg: String,
});

const count = ref(0);
</script>

<template>
  <div>
    <div>
      <a href="https://vitejs.dev" target="_blank">
        <img src="/vite.svg" class="logo" alt="Vite logo" />
      </a>
      <a href="https://vuejs.org/" target="_blank">
        <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
      </a>
    </div>
    <h1>Vite + Vue3</h1>
    <div>
      <h2>React component:</h2>
      <ReactCounter :count="3" />

      <h2>Vue3 component:</h2>
      <VueCounter :count="3" />

      <h2>Vue2 component:</h2>
      <Vue2Counter :count="3" />
    </div>
    <div class="card">
      <button type="button" @click="count++">count is {{ count }}</button>
    </div>
    <p>
      Edit <code>packages/vue3/App.vue</code> and save to test HMR
    </p>
  </div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
