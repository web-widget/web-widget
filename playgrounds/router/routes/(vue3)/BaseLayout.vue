<script setup lang="ts">
import { onMounted } from 'vue';
import '../(css)/base-layout.css';
import '../(css)/ui.css';
import { container } from '@web-widget/vue/adapter';

const Menu = container(() => import('../(components)/Menu@widget.ts'));

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
  <header class="site-header">
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
