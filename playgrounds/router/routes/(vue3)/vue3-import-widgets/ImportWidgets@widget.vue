<script setup lang="ts">
import ReactCounter from '../../(components)/Counter@widget';
import Vue3Counter from '../Counter@widget.vue';
import Vue2Counter from '../../(vue2)/Counter@widget.vue';
import VanillaCounter from '../../(components)/VanillaCounter@widget';
</script>

<template>
  <div>
    <h2>React component:</h2>
    <ReactCounter :count="3" />

    <h2>Vue3 component:</h2>
    <Vue3Counter :count="3" />

    <h2>Vue2 component:</h2>
    <Vue2Counter :count="3" />

    <h2>Vanilla component:</h2>
    <VanillaCounter :count="3" />
  </div>
</template>
