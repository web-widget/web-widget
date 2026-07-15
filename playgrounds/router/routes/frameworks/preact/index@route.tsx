/** @jsxImportSource preact */
import { defineMeta } from '@web-widget/helpers';
import { container } from '@web-widget/preact/adapter';
import Counter from './Counter@widget';
import Layout from './Layout';

const Vue3Counter = container(
  () =>
    import('@playgrounds/web-router-vue3/frameworks/vue3/Counter@widget.vue')
);
const ReactCounter = container(() => import('../react/Counter@widget'));
const Vue2Counter = container(
  () =>
    import('@playgrounds/web-router-vue2/frameworks/vue2/Counter@widget.vue')
);
const SvelteCounter = container(
  () => import('../svelte/Counter@widget.svelte')
);
const SolidCounter = container(() => import('../solid/Counter@widget'));
const WebComponentCounter = container<{ count?: number }>(
  () => import('~/routes/(components)/WebComponentCounter@widget.wc')
);
const LitCounter = container<{ count?: number }>(
  () => import('~/routes/(components)/LitCounter@widget.lit')
);

export const meta = defineMeta({ title: 'Preact route' });

export default function Page() {
  return (
    <Layout>
      <header class="ds-page-header">
        <h1>Preact route</h1>
        <p class="ds-description">
          A Preact route importing a Preact component, rendered on the server
          and hydrated in the browser.
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
        <h3>Solid Widget</h3>
        <SolidCounter count={3} />
        <h3>Web Components Widget</h3>
        <WebComponentCounter widget={{ clientOnly: true }} count={3} />
        <h3>Lit Widget</h3>
        <LitCounter widget={{ clientOnly: true }} count={3} />
      </section>
    </Layout>
  );
}
