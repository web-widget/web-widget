<script>
import '../(css)/base-layout.css';
import '../(css)/ui.css';
import { widget } from '@web-widget/vue2/adapter';
import { menuEnhancementScript } from '../(components)/menu-client';

const Menu = widget(() => import('../(components)/Menu@widget.ts'));
const enhancementMarkup = `<script>${menuEnhancementScript}<\/script>`;

export default {
  components: { Menu },
  data() {
    return { enhancementMarkup };
  },
};
</script>
<template>
  <div>
    <header class="site-header">
      <h1>Web Router Playground</h1>
    </header>
    <div class="container">
      <aside data-playground-menu>
        <Menu :widget="{ serverOnly: true }" />
      </aside>
      <main>
        <slot></slot>
      </main>
    </div>
    <footer>
      <p>This is a footer</p>
    </footer>
    <div v-html="enhancementMarkup" hidden></div>
  </div>
</template>
