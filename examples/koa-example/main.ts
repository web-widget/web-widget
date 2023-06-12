

import { html, HTMLResponse } from "@worker-tools/html";
import { createWebRequest, sendWebResponse } from "@web-widget/koa"
const template = html`<div>hello world</div>`;

const res = new HTMLResponse(template);
console.log('res', res);

console.log(createWebRequest)



