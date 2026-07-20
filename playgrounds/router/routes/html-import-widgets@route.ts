import { html } from '@web-widget/html';
import { widget } from '@web-widget/html/adapter';
import { defineRouteComponent } from '@web-widget/helpers';
import { htmlLayout } from './(components)/HtmlLayout';

const ReactCounter = widget(
  () => import('~/routes/(components)/react/Counter@widget')
);
const Vue3Counter = widget(
  () => import('~/routes/(vue3)/(components)/Vue3Counter@widget.vue')
);
const Vue2Counter = widget(
  () => import('~/routes/(vue2)/(components)/Vue2Counter@widget.vue')
);
export default defineRouteComponent(async function Page() {
  return htmlLayout(
    html`<header class="ds-page-header">
        <h1>HTML: Import React and Vue</h1>
        <p class="ds-description">
          An HTML template route that imports and renders React, Vue 3, and Vue
          2 widgets using <code>widget()</code> — no manual type adapters
          needed.
        </p>
      </header>

      <section class="ds-section">
        <h2>React component</h2>
        ${ReactCounter({ count: 3 })}
      </section>

      <section class="ds-section">
        <h2>Vue3 component</h2>
        ${Vue3Counter({ count: 3 })}
      </section>

      <section class="ds-section">
        <h2>Vue2 component</h2>
        ${Vue2Counter({ count: 3 })}
      </section> `
  );
});
