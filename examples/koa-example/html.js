import { html, HTMLResponse } from "@worker-tools/html";

const template = html`<div>hello world</div>`;

const res = new HTMLResponse(template);

console.log(res);