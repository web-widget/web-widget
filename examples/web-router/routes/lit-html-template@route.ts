import { render, html } from "@web-widget/html";
import type { RouteComponentProps } from "@web-widget/html";
import type { HelloData } from "./api/hello-world@route";

export { render };

async function fetchData(url: URL) {
  const data = await fetch(`${url.origin}/api/hello-world`);
  return (await data.json()) as HelloData;
}

export default async function Page(ctx: RouteComponentProps<HelloData>) {
  const list = await fetchData(new URL(ctx.request.url));
  return html`<h1>Lit html template</h1>
    <ul>
      ${list.map((item, index) => {
        return html`<li key="${index}">
          <a href="${item.url}">${item.title}</a>
        </li>`;
      })}
    </ul>`;
}
