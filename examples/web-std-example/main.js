

import { html, HTMLResponse } from "@worker-tools/html";
import { installGlobals } from "@web-widget/web-std";
installGlobals();

const template = html`<div>hello world</div>`;

const res = new HTMLResponse(template);
console.log('res', res);




