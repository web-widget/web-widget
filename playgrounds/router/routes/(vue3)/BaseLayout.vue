<script setup lang="ts">
import { onMounted } from 'vue';
import '../(css)/base-layout.css';
import Menu from './Menu@widget.vue';

onMounted(() => {
  const path = location.pathname;
  document.querySelectorAll('aside a[href]').forEach((a) => {
    if (a.getAttribute('href') === path) {
      a.setAttribute('aria-current', 'page');
    }
  });
});
</script>
<template>
  <header>
    <h1>Web Router Playground</h1>
  </header>
  <div class="container">
    <aside>
      <Menu :widget="{ serverOnly: true }" />
    </aside>
    <main><slot></slot></main>
  </div>
  <footer>
    <p>This is a footer</p>
  </footer>
</template>
