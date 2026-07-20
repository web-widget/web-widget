/** @jsxImportSource solid-js */
import { defineMeta } from '@web-widget/helpers';
import { widget } from '@web-widget/solid/adapter';
import Layout from '~/routes/(components)/solid/Layout';

const SolidCounter = widget(
  () => import('~/routes/(components)/solid/Counter@widget'),
  { renderTarget: 'shadow' }
);
const SlotPanel = widget(
  () => import('~/routes/(components)/slots/SlotPanel@widget'),
  { renderTarget: 'shadow' }
);
const ReactCounter = widget(
  () => import('~/routes/(components)/react/Counter@widget'),
  { renderTarget: 'shadow' }
);
const Vue3Counter = widget(
  () => import('~/routes/(vue3)/(components)/Vue3Counter@widget.vue'),
  { renderTarget: 'shadow' }
);
const Vue2Counter = widget(
  () => import('~/routes/(vue2)/(components)/Vue2Counter@widget.vue'),
  { renderTarget: 'shadow' }
);
const SvelteCounter = widget(
  () => import('~/routes/(components)/svelte/Counter@widget.svelte'),
  { renderTarget: 'shadow' }
);
const PreactCounter = widget(
  () => import('~/routes/(components)/preact/Counter@widget'),
  { renderTarget: 'shadow' }
);
const WebComponentCounter = widget<{ count?: number }>(
  () => import('~/routes/(components)/WebComponentCounter@widget.wc'),
  { renderTarget: 'shadow' }
);
const LitCounter = widget<{ count?: number }>(
  () => import('~/routes/(components)/LitCounter@widget.lit'),
  { renderTarget: 'shadow' }
);

export const meta = defineMeta({ title: 'Solid Shadow DOM route' });

export default function Page() {
  return (
    <Layout>
      <header class="ds-page-header">
        <h1>Solid Shadow DOM route</h1>
        <p class="ds-description">
          A Solid route rendering imported Widgets into isolated declarative
          shadow roots.
        </p>
      </header>
      <section class="ds-section">
        <h2>Native Widget</h2>
        <SolidCounter count={3} />
      </section>
      <section class="ds-section">
        <h2>Native slots</h2>
        <div class="shadow-slot-example">
          <SlotPanel widget={{ id: 'solid-slot-panel' }}>
            <h3 class="shadow-slot-title" slot="title">
              Solid title
            </h3>
            <p class="shadow-slot-content">Projected from Solid.</p>
            <SolidCounter count={0} slot="actions" />
          </SlotPanel>
        </div>
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
