<script setup lang="ts">
import ReactCounter from "../../(components)/Counter@widget.tsx";
import VueCounter from "../Counter@widget.vue";
import VanillaCounter from "../../(components)/Counter@widget.ts";
</script>

<template>
  <div>
       <h2>React component:</h2>
      <ReactCounter name="React Counter" :start="3" />

      <h2>Vue3 component:</h2>
      <VueCounter name="Vue3 Counter" :start="3" />

      <h2>Vanilla component:</h2>
      <VanillaCounter name="Vanilla Counter" :start="3" /> 
  </div>
</template>

