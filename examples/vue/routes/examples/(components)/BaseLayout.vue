<script setup lang="ts">
import './global.css';
import styles from './BaseLayout.module.css';
import Navigation from './Navigation@widget.vue';

interface BaseLayoutProps {
  children?: any;
}

defineProps<BaseLayoutProps>();
</script>

<template>
  <a href="#main-content" class="skip-link">
    Skip navigation, go to main content
  </a>

  <header :class="styles.header">
    <div :class="styles.headerContent">
      <div :class="styles.brandLogo">
        <a :class="styles.brandText" href="/">
          Web Widget
        </a>
        <div :class="styles.techStackBadge">
          <span :class="styles.techText">Vue Example</span>
        </div>
      </div>
      <Navigation />
    </div>
  </header>

  <main id="main-content" :class="styles.main" tabindex="-1">
    <slot />
  </main>

  <footer :class="styles.footer">
    <div :class="styles.footerContent">
      <div :class="styles.footerBrand">
        <h3 :class="styles.footerBrandName">Web Widget</h3>
        <p :class="styles.footerTagline">
          Simplicity is the ultimate sophistication
        </p>
      </div>

      <div :class="styles.footerLinks">
        <a href="https://github.com/web-widget/web-widget#readme" target="_blank" rel="noopener noreferrer"
          :class="styles.footerLink">
          📚 Documentation
        </a>
        <a href="https://github.com/web-widget/web-widget" target="_blank" rel="noopener noreferrer"
          :class="styles.footerLink">
          ⭐ GitHub
        </a>
      </div>
    </div>
  </footer>
</template>