<script setup lang="ts">
import "../css/base-layout.css";
import Menu from "../widgets/Menu.vue";
</script>
<template>
    <div class="container">
    <aside>
      <Menu renderStage="server" />
    </aside>
    <main><slot></slot></main>
  </div>
</template>