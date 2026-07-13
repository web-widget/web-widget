import { html, suspense } from '@web-widget/html';
import { asHtmlWidget } from '@web-widget/html/adapter';
import { defineRouteComponent } from '@web-widget/helpers';
import './(css)/demo-states.css';
import { htmlLayout } from './(components)/HtmlLayout';
import Wait from './(components)/Wait@widget';

const WaitWidget = asHtmlWidget<{ id: string }>(Wait);

/** Simulates a slow data fetch that resolves after `ms` milliseconds. */
function slowData<T>(data: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

export default defineRouteComponent(async function Page() {
  return htmlLayout(
    html`<h1>HTML: Suspense Streaming</h1>
      <p>
        This page uses <code>suspense()</code> from
        <code>@web-widget/html</code> for progressive rendering — slow async
        content does not block the rest of the page.
      </p>

      <p>This paragraph appears immediately.</p>

      <h2>Slow section A (resolves in ~1s)</h2>
      ${suspense(
      slowData(html`<div class="demo-success">Section A loaded!</div>`, 1000),
      html`<div class="demo-loading">Loading A...</div>`
    )}

      <h2>Slow section B (resolves in ~2s)</h2>
      ${suspense(
      slowData(html`<div class="demo-info">Section B loaded!</div>`, 2000),
      html`<div class="demo-loading">Loading B...</div>`
    )}

      <h2>Widget with Suspense fallback (resolves in ~1-3s)</h2>
      <p>
        Widgets accept a <code>fallback</code> option to integrate with Suspense
        streaming — the widget renders asynchronously without blocking the page.
      </p>
      ${WaitWidget({
      id: 'html-suspense',
      widget: {
        fallback: html`<div class="demo-loading">Loading widget...</div>`,
      },
    })}

      <p>This footer also appears immediately, before any section resolves.</p>`
  );
});
