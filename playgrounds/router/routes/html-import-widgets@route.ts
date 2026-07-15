import { html } from '@web-widget/html';
import { container } from '@web-widget/html/adapter';
import { defineRouteComponent } from '@web-widget/helpers';
import { htmlLayout } from './(components)/HtmlLayout';

const ReactCounter = container(
  () => import('./frameworks/react/Counter@widget')
);
const Vue3Counter = container(
  () =>
    import('@playgrounds/web-router-vue3/frameworks/vue3/Counter@widget.vue')
);
const Vue2Counter = container(
  () =>
    import('@playgrounds/web-router-vue2/frameworks/vue2/Counter@widget.vue')
);
export default defineRouteComponent(async function Page() {
  return htmlLayout(
    html`<header class="ds-page-header">
        <h1>HTML: Import React and Vue</h1>
        <p class="ds-description">
          An HTML template route that imports and renders React, Vue 3, and Vue
          2 widgets using <code>container()</code> — no manual type adapters
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
