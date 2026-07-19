<template>
  <section class="ds-section">
    <h2>{{ title }}</h2>
    <p v-if="description" class="ds-description">{{ description }}</p>
    <slot />
  </section>
</template>

<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>
