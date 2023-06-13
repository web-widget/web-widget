import "./install.js";
import { html, HTMLResponse } from "./html.js";

const template = html`<div>hello world</div>`;

const res = new HTMLResponse(template);

res.text().then(console.log)




