import { fallback, html, suspense } from '@web-widget/html';
import { defineRouteComponent, defineRouteHandler } from '@web-widget/helpers';
import '~/routes/(css)/demo-states.css';
import './suspense.css';
import { htmlLayout } from '~/routes/(components)/HtmlLayout';

const wait = <T>(value: T, ms: number): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

const pending = (label: string) =>
  html`<div class="demo-loading">Pending: ${label}</div>`;

const error = html`<div class="demo-error">
  Error: section failed to load.
</div>`;
const nestedPending = (label: string) =>
  html`<div class="demo-loading suspense-nested-item">Pending: ${label}</div>`;

export const handler = defineRouteHandler({
  async GET(ctx) {
    return ctx.html(undefined, { renderer: { progressive: true } });
  },
});

export default defineRouteComponent(function Page() {
  const first = suspense(
    wait(html`<div class="demo-success">First section resolved.</div>`, 700),
    pending('first section')
  );
  const second = suspense(
    wait(html`<div class="demo-success">Second section resolved.</div>`, 1400),
    pending('second section')
  );
  const nested = suspense(
    wait(
      html`<div class="demo-info suspense-nested-slot">
        <span class="suspense-nested-label">Outer content resolved.</span>
        ${suspense(
          wait(
            html`<strong class="demo-success suspense-nested-item">
              Nested content resolved.
            </strong>`,
            900
          ),
          nestedPending('nested content')
        )}
      </div>`,
      500
    ),
    html`<div class="demo-loading suspense-nested-slot">
      <span class="suspense-nested-label">Pending: outer content</span>
    </div>`
  );
  const failed = fallback(
    suspense(
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Suspense content failed')), 600)
      ),
      pending('error section')
    ),
    error
  );

  return htmlLayout(
    html`<header class="ds-page-header">
        <h1>HTML: Suspense component streaming</h1>
        <p class="ds-description">
          Native HTML suspense boundaries send pending content first and replace
          each boundary as its asynchronous content resolves.
        </p>
      </header>
      <section class="ds-section">
        <h2>Independent boundaries resolve in completion order</h2>
        <p class="ds-description">
          These sections resolve at different times without blocking one
          another.
        </p>
        ${first} ${second}
      </section>
      <section class="ds-section">
        <h2>Nested boundaries stream independently</h2>
        <p class="ds-description">
          A boundary can contain another boundary, each with its own pending UI.
        </p>
        ${nested}
      </section>
      <section class="ds-section">
        <h2>Errors can recover inside a suspense boundary</h2>
        <p class="ds-description">
          The error fallback replaces pending content while the rest of the page
          remains available.
        </p>
        ${failed}
      </section>`
  );
});
