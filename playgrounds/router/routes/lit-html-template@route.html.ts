import { html } from '@web-widget/html';
import { defineRouteComponent } from '@web-widget/helpers';
import type { HelloData } from './api/hello-world@route';

async function fetchData(url: URL) {
  const data = await fetch(`${url.origin}/api/hello-world`);
  return (await data.json()) as HelloData;
}

export default defineRouteComponent<HelloData>(async function Page(ctx) {
  const list = await fetchData(new URL(ctx.request.url));
  return html`<h1>Lit html template</h1>
    <ul>
      ${list.map((item, index) => {
        return html`<li key="${index}">
          <a href="${item.url}">${item.title}</a>
        </li>`;
      })}
    </ul>`;
});
