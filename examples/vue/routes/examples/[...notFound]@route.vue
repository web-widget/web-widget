<script setup lang="ts">
import { defineMeta } from '@web-widget/helpers';
import BaseLayout from './(components)/BaseLayout.vue';
import shared from './(components)/shared.module.css';
import styles from './notFound.module.css';

defineOptions({
  meta: defineMeta({
    title: '404 - Not Found',
  }),
});
</script>

<template>
  <BaseLayout>
    <div :class="shared.container">
      <div :class="styles.errorContainer">
        <div :class="styles.errorIcon">🔍</div>
        <h1 :class="styles.errorTitle">Not Found</h1>
        <p :class="styles.errorSubtitle">
          Sorry, the page you are looking for does not exist or has been moved.
        </p>
      </div>
    </div>
  </BaseLayout>
</template>
