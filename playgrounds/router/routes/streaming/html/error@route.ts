import { html, suspense, fallback } from '@web-widget/html';
import { container } from '@web-widget/html/adapter';
import type { HTML } from '@web-widget/html';
import { defineRouteComponent, defineRouteHandler } from '@web-widget/helpers';
import '~/routes/(css)/demo-states.css';
import { htmlLayout } from '~/routes/(components)/HtmlLayout';

const WaitWidget = container(() => import('~/routes/(components)/Wait@widget'));
const FailWidget = container(() => import('~/routes/(components)/Fail@widget'));

/** A promise that resolves to HTML after `ms` milliseconds. */
function slowHTML(ms: number, content: HTML): Promise<HTML> {
  return new Promise((resolve) => setTimeout(() => resolve(content), ms));
}

/** A promise that rejects after `ms` milliseconds. */
function failAfter(ms: number): Promise<HTML> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Data fetch failed')), ms)
  );
}

const loading = html`<div class="demo-loading">Loading...</div>`;
const error = html`<div class="demo-error">Something went wrong.</div>`;

export const handler = defineRouteHandler({
  async GET(ctx) {
    return ctx.html(undefined, { renderer: { progressive: true } });
  },
});

export default defineRouteComponent(async function Page() {
  return htmlLayout(
    html`<header class="ds-page-header">
        <h1>HTML: Streaming Error</h1>
        <p class="ds-description">
          This page demonstrates Suspense streaming with error recovery. The
          failing section is caught and its fallback stays visible — the rest of
          the page remains functional.
        </p>
      </header>

      <section class="ds-section">
        <h2>Normal section (succeeds in ~1s)</h2>
        ${suspense(
          slowHTML(
            1000,
            html`<div class="demo-success">Section loaded successfully!</div>`
          ),
          loading
        )}
      </section>

      <section class="ds-section">
        <h2>Failing section (rejects in ~1s)</h2>
        ${fallback(suspense(failAfter(1000), loading), error)}
      </section>

      <section class="ds-section">
        <h2>Widget that succeeds (~1-3s)</h2>
        ${WaitWidget({ id: 'ok:0', widget: { fallback: loading } })}
      </section>

      <section class="ds-section">
        <h2>Widget that fails (~0.5s)</h2>
        ${FailWidget({
          id: 'fail:0',
          widget: { fallback: { pending: loading, error } },
        })}
      </section>

      <section class="ds-section">
        <h2>Another normal section after the failure</h2>
        ${suspense(
          slowHTML(
            500,
            html`<div class="demo-info">
              Page recovered — this section works fine!
            </div>`
          ),
          loading
        )}
      </section>

      <p>This footer appears immediately and stays regardless of errors.</p>`
  );
});
