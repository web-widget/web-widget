<script>
import '../(css)/base-layout.css';
import '../(css)/ui.css';
import { widget } from '@web-widget/vue2/adapter';

const Menu = widget(() => import('../(components)/Menu@widget.ts'));

export default {
  components: { Menu },
  mounted() {
    const path = location.pathname;
    document.querySelectorAll('aside a[href]').forEach((a) => {
      if (a.getAttribute('href') === path) {
        a.setAttribute('aria-current', 'page');
      }
    });
  },
};
</script>
<template>
  <div>
    <header class="site-header">
      <h1>Web Router Playground</h1>
    </header>
    <div class="container">
      <aside>
        <Menu :widget="{ serverOnly: true }" />
      </aside>
      <main>
        <slot></slot>
      </main>
    </div>
    <footer>
      <p>This is a footer</p>
    </footer>
  </div>
</template>
