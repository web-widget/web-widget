import { html } from '@web-widget/html';
import { widget } from '@web-widget/html/adapter';
import { defineMeta, defineRouteComponent } from '@web-widget/helpers';
import { htmlLayout } from '~/routes/(components)/HtmlLayout';

const ReactCounter = widget(() => import('../react/Counter@widget'));
const Vue3Counter = widget(
  () =>
    import('@playgrounds/web-router-vue3/frameworks/vue3/Counter@widget.vue')
);
const Vue2Counter = widget(
  () =>
    import('@playgrounds/web-router-vue2/frameworks/vue2/Counter@widget.vue')
);
const SvelteCounter = widget(() => import('../svelte/Counter@widget.svelte'));
const SolidCounter = widget(() => import('../solid/Counter@widget'));
const PreactCounter = widget(() => import('../preact/Counter@widget'));
const WebComponentCounter = widget<{ count?: number }>(
  () => import('~/routes/(components)/WebComponentCounter@widget.wc')
);
const LitCounter = widget<{ count?: number }>(
  () => import('~/routes/(components)/LitCounter@widget.lit')
);

export const meta = defineMeta({ title: 'HTML route' });

export default defineRouteComponent(function Page() {
  return htmlLayout(
    html`<header class="ds-page-header">
        <h1>HTML route</h1>
        <p class="ds-description">
          An HTML template route importing an HTML component and rendering it on
          the server without a virtual DOM.
        </p>
      </header>
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
