<template>
  <header class="ds-page-header">
    <h1>{{ title }}</h1>
    <p v-if="description" class="ds-description">{{ description }}</p>
    <slot />
  </header>
</template>

<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>
