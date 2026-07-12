import { html, fallback } from '@web-widget/html';
import { asHtmlWidget } from '@web-widget/html/adapter';
import { defineRouteComponent } from '@web-widget/helpers';
import ReactCounter from './(components)/Counter@widget';

const Counter = asHtmlWidget<{ count: number }>(ReactCounter);

async function fakeFetchData(): Promise<string[]> {
  await new Promise((r) => setTimeout(r, 100));
  return ['Item 1', 'Item 2', 'Item 3'];
}

export default defineRouteComponent(async function Page() {
  const items = await fakeFetchData();

  return html`<div>
    <h1>HTML Widget Islands</h1>

    <p>
      This page is rendered with <code>@web-widget/html</code> templates and
      embeds framework widgets as interactive islands.
    </p>

    <h2>React widget (auto container injection)</h2>
    ${fallback(
      Counter({ count: 5 }),
      () => html`<div>Widget failed to load</div>`
    )}

    <h2>Server-only widget (static HTML, no client hydration)</h2>
    ${Counter({ count: 99, widget: { serverOnly: true } })}

    <h2>Streaming data</h2>
    <ul>
      ${items.map((item, index) => html`<li>${index}: ${item}</li>`)}
    </ul>
  </div>`;
});
