import { defineMeta } from '@web-widget/helpers';
import { container } from '@web-widget/solid/adapter';
import Counter from './Counter@widget.solid';
import Layout from './Layout.solid';

const ReactCounter = container(() => import('../react/Counter@widget'));
const Vue3Counter = container(
  () =>
    import('@playgrounds/web-router-vue3/frameworks/vue3/Counter@widget.vue')
);
const Vue2Counter = container(
  () =>
    import('@playgrounds/web-router-vue2/frameworks/vue2/Counter@widget.vue')
);
const SvelteCounter = container(
  () => import('../svelte/Counter@widget.svelte')
);
const PreactCounter = container(
  () => import('../preact/Counter@widget.preact')
);
const WebComponentCounter = container<{ count?: number }>(
  () => import('../../(components)/WebComponentCounter@widget.wc')
);
const LitCounter = container<{ count?: number }>(
  () => import('../../(components)/LitCounter@widget.lit')
);

export const meta = defineMeta({ title: 'Solid route' });

export default function Page() {
  return (
    <Layout>
      <header class="ds-page-header">
        <h1>Solid route</h1>
        <p class="ds-description">
          A Solid route importing a Solid component, rendered on the server and
          hydrated in the browser.
        </p>
      </header>
      <section class="ds-section">
        <h2>Native Widget</h2>
        <Counter count={3} />
      </section>
      <section class="ds-section">
        <h2>Widgets from other frameworks</h2>
        <h3>React Widget</h3>
        <ReactCounter count={3} />
        <h3>Vue 3 Widget</h3>
        <Vue3Counter count={3} />
        <h3>Vue 2 Widget</h3>
        <Vue2Counter count={3} />
        <h3>Svelte Widget</h3>
        <SvelteCounter count={3} />
        <h3>Preact Widget</h3>
        <PreactCounter count={3} />
        <h3>Web Components Widget</h3>
        <WebComponentCounter widget={{ clientOnly: true }} count={3} />
        <h3>Lit Widget</h3>
        <LitCounter widget={{ clientOnly: true }} count={3} />
      </section>
    </Layout>
  );
}
