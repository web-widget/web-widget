<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import styles from './Navigation.module.css';

interface NavigationProps {
  className?: string;
}

const props = withDefaults(defineProps<NavigationProps>(), {
  className: '',
});

const currentPath = ref('');
const isMobileMenuOpen = ref(false);

const navigationItems = [
  { href: '/examples', label: 'Home', matchPath: '/examples' },
  {
    href: '/examples/static',
    label: 'Static Page',
    matchPath: '/examples/static',
  },
  {
    href: '/examples/params/web-widget',
    label: 'Dynamic Routing',
    matchPath: '/examples/params',
  },
  {
    href: '/examples/fetch',
    label: 'Data Fetching',
    matchPath: '/examples/fetch',
  },
  {
    href: '/examples/action',
    label: 'Server Actions',
    matchPath: '/examples/action',
  },
  {
    href: '/examples/frameworks',
    label: 'Widgets',
    matchPath: '/examples/frameworks',
  },
  {
    href: '/examples/middleware',
    label: 'Middleware',
    matchPath: '/examples/middleware',
  },
];

const isActiveLink = (matchPath: string) => {
  if (matchPath === '/examples') {
    return currentPath.value === '/examples' || currentPath.value === '/';
  }
  return currentPath.value.startsWith(matchPath) && matchPath !== '/';
};

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};

const handleLinkClick = () => {
  closeMobileMenu();
};

const handlePopState = () => {
  currentPath.value = window.location.pathname;
};

const handleClick = (e: Event) => {
  const target = e.target as HTMLAnchorElement;
  if (target.tagName === 'A' && target.href && !target.target) {
    setTimeout(() => {
      currentPath.value = window.location.pathname;
    }, 50);
  }
};

const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isMobileMenuOpen.value) {
    closeMobileMenu();
  }
};

onMounted(() => {
  currentPath.value = window.location.pathname;

  window.addEventListener('popstate', handlePopState);
  document.addEventListener('click', handleClick);
  document.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  window.removeEventListener('popstate', handlePopState);
  document.removeEventListener('click', handleClick);
  document.removeEventListener('keydown', handleEscape);
});
</script>

<template>
  <nav :class="`${styles.navigation} ${props.className}`" aria-label="Main navigation" role="navigation">
    <button :class="styles.mobileMenuButton" @click="toggleMobileMenu" :aria-expanded="isMobileMenuOpen"
      aria-controls="mobile-navigation-menu"
      :aria-label="isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'">
      <span :class="styles.hamburgerIcon">
        <span :class="`${styles.hamburgerLine} ${isMobileMenuOpen ? styles.hamburgerLineOpen : ''}`"></span>
        <span :class="`${styles.hamburgerLine} ${isMobileMenuOpen ? styles.hamburgerLineOpen : ''}`"></span>
        <span :class="`${styles.hamburgerLine} ${isMobileMenuOpen ? styles.hamburgerLineOpen : ''}`"></span>
      </span>
    </button>

    <ul id="mobile-navigation-menu"
      :class="`${styles.navigationMenu} ${isMobileMenuOpen ? styles.navigationMenuOpen : ''}`" role="list"
      :aria-hidden="!isMobileMenuOpen ? 'true' : 'false'">
      <li v-for="item in navigationItems" :key="item.matchPath" role="listitem">
        <a :href="item.href" :class="isActiveLink(item.matchPath) ? styles.active : ''"
          :aria-current="isActiveLink(item.matchPath) ? 'page' : undefined"
          :aria-label="`${item.label}${isActiveLink(item.matchPath) ? ' (current page)' : ''}`"
          @click="handleLinkClick">
          {{ item.label }}
        </a>
      </li>
    </ul>

    <!-- Mobile menu background overlay -->
    <div v-if="isMobileMenuOpen" :class="styles.mobileMenuOverlay" @click="closeMobileMenu" aria-hidden="true" />
  </nav>
</template>