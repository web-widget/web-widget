<script setup lang="ts">
import { defineMeta } from '@web-widget/helpers';
import BaseLayout from '../(components)/BaseLayout.vue';
import shared from '../(components)/shared.module.css';

interface Params {
  name: string;
}

defineOptions({
  meta: defineMeta({
    title: 'Dynamic Routing - Web Widget',
  }),
});

const { params } = defineProps<{ params: Params }>();
const { name } = params;
</script>

<template>
  <BaseLayout>
    <div :class="shared.container">
      <h1 :class="shared.pageTitle">🎯 Dynamic Routing</h1>

      <div :class="`${shared.highlight} ${shared.info}`">
        <h2>File-system-based dynamic route handling</h2>
        <p>
          Web Widget uses file system routing with support for dynamic
          parameter capture.
        </p>
      </div>

      <div :class="`${shared.infoPanel} ${shared.success}`">
        <h3 :class="shared.subsectionTitle">👋 Greeting</h3>
        <p style="font-size: 1.25rem; margin-bottom: 1rem;">
          Hello, <strong>{{ name }}</strong>!
        </p>
        <p :class="shared.textMuted" style="font-size: 0.875rem;">
          The dynamic parameter <code>[name]</code> from the current URL has
          the value:
          <code>{{ name }}</code>
        </p>
      </div>

      <div :class="shared.mb6">
        <h3 :class="shared.sectionTitle">Try Other Examples</h3>
        <div :class="`${shared.grid} ${shared.grid3}`">
          <a href="/examples/params/react" :class="`${shared.card} ${shared.cardHover}`"
            style="text-decoration: none; color: inherit;">
            <div :class="shared.textCenter">
              <div :class="shared.cardIcon">⚛️</div>
              <div :class="shared.cardTitle">React</div>
            </div>
          </a>
          <a href="/examples/params/vue" :class="`${shared.card} ${shared.cardHover}`"
            style="text-decoration: none; color: inherit;">
            <div :class="shared.textCenter">
              <div :class="shared.cardIcon">💚</div>
              <div :class="shared.cardTitle">Vue</div>
            </div>
          </a>
          <a href="/examples/params/developer" :class="`${shared.card} ${shared.cardHover}`"
            style="text-decoration: none; color: inherit;">
            <div :class="shared.textCenter">
              <div :class="shared.cardIcon">👨‍💻</div>
              <div :class="shared.cardTitle">Developer</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  </BaseLayout>
</template>