import { defineMeta, defineRouteComponent } from '@web-widget/helpers';
import { html } from '@web-widget/html';
import { widget } from '@web-widget/html/adapter';
import { htmlLayout } from '~/routes/(components)/HtmlLayout';

const ReactCounter = widget(
  () => import('~/routes/(components)/react/Counter@widget'),
  { root: 'shadow' }
);
const SlotPanel = widget(
  () => import('~/routes/(components)/slots/SlotPanel@widget'),
  { root: 'shadow' }
);
const Vue3Counter = widget(
  () => import('~/routes/(vue3)/(components)/Vue3Counter@widget.vue'),
  { root: 'shadow' }
);
const Vue2Counter = widget(
  () => import('~/routes/(vue2)/(components)/Vue2Counter@widget.vue'),
  { root: 'shadow' }
);
const SvelteCounter = widget(
  () => import('~/routes/(components)/svelte/Counter@widget.svelte'),
  { root: 'shadow' }
);
const SolidCounter = widget(
  () => import('~/routes/(components)/solid/Counter@widget'),
  { root: 'shadow' }
);
const PreactCounter = widget(
  () => import('~/routes/(components)/preact/Counter@widget'),
  { root: 'shadow' }
);
const WebComponentCounter = widget<{ count?: number }>(
  () => import('~/routes/(components)/WebComponentCounter@widget.wc'),
  { root: 'shadow' }
);
const LitCounter = widget<{ count?: number }>(
  () => import('~/routes/(components)/LitCounter@widget.lit'),
  { root: 'shadow' }
);

export const meta = defineMeta({ title: 'HTML Shadow DOM route' });

export default defineRouteComponent(function Page() {
  return htmlLayout(
    html`<header class="ds-page-header">
        <h1>HTML Shadow DOM route</h1>
        <p class="ds-description">
          An HTML template route rendering imported Widgets into isolated
          declarative shadow roots.
        </p>
      </header>
      <section class="ds-section">
        <h2>Native slots</h2>
        <div class="shadow-slot-example">
          ${SlotPanel({
            children: html`<h3 class="shadow-slot-title" slot="title">
                HTML title
              </h3>
              <p class="shadow-slot-content">Projected from HTML.</p>
              ${ReactCounter({ count: 0, slot: 'actions' })}`,
            widget: { id: 'html-slot-panel' },
          })}
        </div>
      </section>
      <section class="ds-section">
        <h2>Widgets from other frameworks</h2>
        <h3>React Widget</h3>
        ${ReactCounter({ count: 3 })}
        <h3>Vue 3 Widget</h3>
        ${Vue3Counter({ count: 3 })}
        <h3>Vue 2 Widget</h3>
        ${Vue2Counter({ count: 3 })}
        <h3>Svelte Widget</h3>
        ${SvelteCounter({ count: 3 })}
        <h3>Solid Widget</h3>
        ${SolidCounter({ count: 3 })}
        <h3>Preact Widget</h3>
        ${PreactCounter({ count: 3 })}
        <h3>Web Components Widget</h3>
        ${WebComponentCounter({ widget: { clientOnly: true }, count: 3 })}
        <h3>Lit Widget</h3>
        ${LitCounter({ widget: { clientOnly: true }, count: 3 })}
      </section>`
  );
});
