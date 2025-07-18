<script setup lang="ts">
import styles from './ErrorPage.module.css';

interface ErrorPageProps {
  /** Error page title */
  title?: string;
  /** Error page subtitle */
  subtitle?: string;
  /** Error message */
  message?: string;
  /** Custom icon */
  icon?: string;
}

const props = withDefaults(defineProps<ErrorPageProps>(), {
  title: 'Not Found',
  subtitle: 'Sorry, the page you are looking for does not exist or has been moved.',
  icon: '🔍',
});
</script>

<template>
  <div :class="styles.errorContainer">
    <div :class="styles.errorIcon">{{ props.icon }}</div>
    <h1 :class="styles.errorTitle">{{ props.title }}</h1>
    <p :class="styles.errorSubtitle">{{ props.subtitle }}</p>
    <div v-if="props.message" :class="styles.errorMessage">
      {{ props.message }}
    </div>
  </div>
</template>
