<template>
  <BaseLayout>
    <h1>Server actions</h1>
    <Echo />
  </BaseLayout>
</template>

<script setup>
import { defineComponent } from 'vue';
import BaseLayout from '../(components)/BaseLayout.vue';
import Echo from './Echo@widget.vue';
</script>