import { html } from '@web-widget/html';
import { widget } from '@web-widget/html/adapter';
import { defineRouteComponent, defineRouteHandler } from '@web-widget/helpers';
import '~/routes/(css)/demo-states.css';
import { htmlLayout } from '~/routes/(components)/HtmlLayout';

const WaitWidget = widget(() => import('~/routes/(components)/Wait@widget'));
const VueWaitWidget = widget(
  () => import('@playgrounds/web-router-vue3/Wait@widget.vue')
);
const FailWidget = widget(() => import('~/routes/(components)/Fail@widget'));
const Pending = html`<div class="demo-loading">
  Pending: loading content...
</div>`;
const ErrorFallback = html`<div class="demo-error">
  Error: content failed to load.
</div>`;

export const handler = defineRouteHandler({
  async GET(ctx) {
    return ctx.html(undefined, { renderer: { progressive: true } });
  },
});

export default defineRouteComponent(async function Page() {
  return htmlLayout(
    html`<header class="ds-page-header">
        <h1>HTML: Progressive streaming</h1>
        <p class="ds-description">
          Pending UI is sent immediately, then replaced by resolved content or
          an error message as asynchronous work settles.
        </p>
      </header>
      <section class="ds-section">
        <h2>Multiple pending items are replaced in completion order</h2>
        <p class="ds-description">
          Each loading state appears immediately; results are streamed into
          their own positions as each request completes.
        </p>
        ${WaitWidget({
          id: 'React Widget 1',
          widget: { fallback: Pending },
        })}
        ${VueWaitWidget({
          id: 'Vue 3 Widget 2',
          widget: { fallback: Pending },
        })}
        ${WaitWidget({
          id: 'React Widget 3',
          widget: { fallback: Pending },
        })}
      </section>
      <section class="ds-section">
        <h2>Pending content is replaced when rendering fails</h2>
        <p class="ds-description">
          The loading state appears first, then the error message recovers this
          section.
        </p>
        ${FailWidget({
          id: 'html:error',
          widget: { fallback: { pending: Pending, error: ErrorFallback } },
        })}
      </section>`
  );
});
