

import { html, HTMLResponse } from "@worker-tools/html";
import { createWebRequest, sendWebResponse } from "@web-widget/koa"
const template = html`<div>hello world</div>`;

const res = new HTMLResponse(template);
console.log('res', res);

console.log(createWebRequest)

// import { router } from "@web-widget/web-server/server";
// import { createWebRequest, sendWebResponse } from "@web-widget/koa"
// import * as manifest from "./web-server.gen.ts";





// import Koa from 'koa';
// const app = new Koa();

// app.use(async ctx => {
//   const webRequest = createWebRequest(ctx.request, ctx.response);



//   const route = await router(manifest);
//   const res = await route.handler(webRequest);
//   console.log('res', res);
//   // await sendWebResponse(ctx.response, res);
// });

// app.listen(3000);
// console.log(`http://localhost:3000/`);


