<script setup lang="ts">
import ReactCounter from "../react/Counter@widget";
import VueCounter from "./Counter@widget.vue?as=jsx";
import Vue2Counter from "../vue2/Counter@widget.vue?as=jsx";
import VanillaCounter from "../vanilla/Counter@widget";
import { ref } from 'vue'

defineProps({
  msg: String,
})

const count = ref(0)
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
    <div>
      <h2>React component:</h2>
        <ReactCounter name="React Counter" :start="3" />

        <h2>Vue3 component:</h2>
        <VueCounter name="Vue3 Counter" :start="3" />

        <h2>Vue2 component:</h2>
        <Vue2Counter name="Vue2 Counter" :start="3" />

        <h2>Vanilla component:</h2>
        <VanillaCounter name="Vanilla Counter" :start="3" /> 
    </div>
    <div class="card">
      <button type="button" @click="count++">count is {{ count }}</button>
    </div>
    <p class="read-the-docs">Click on the Vite and Vue logos to learn more</p>
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
