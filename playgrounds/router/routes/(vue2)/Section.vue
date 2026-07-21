<template>
  <section class="ds-section">
    <h2>{{ title }}</h2>
    <p v-if="description" class="ds-description">{{ description }}</p>
    <slot />
  </section>
</template>

<script>
export default {
  props: { title: String, description: String },
};
</script>
