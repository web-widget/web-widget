<script setup lang="ts">
import "../(css)/base-layout.css";
import Menu from "./Menu@widget.vue";
</script>
<template>
    <header>
      <h1>Web Router Examples</h1>
    </header>
    <div class="container">
    <aside>
      <Menu renderStage="server" />
    </aside>
    <main><slot></slot></main>
  </div>
  <footer>
    <p>This is a footer</p>
  </footer>
</template>