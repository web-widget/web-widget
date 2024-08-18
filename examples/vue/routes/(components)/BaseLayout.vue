<script setup lang="ts">
import './global.css';
import styles from './BaseLayout.module.css';
</script>
<template>
  <header .class="styles.header">
    <nav>
      <ul>
        <li>
          <a href="/">Home</a>
        </li>
        <li>
          <a href="/about">About</a>
        </li>
        <li>
          <a href="/fetch">Fetching data</a>
        </li>
        <li>
          <a href="/greet/web-widget">Dynamic routes</a>
        </li>
      </ul>
    </nav>
  </header>
  <main .class="styles.main">
    <slot></slot>
  </main>
  <footer .class="styles.footer">
    <p>This is a footer</p>
  </footer>
</template>