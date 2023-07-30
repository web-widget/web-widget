import Koa from "koa";
import koaSend from "koa-send";
import { fileURLToPath } from "node:url";
import WebRouter from "@web-widget/web-router";
import { createWebRequest, sendWebResponse } from "@web-widget/koa";

const app = new Koa();

app.use(async (ctx, next) => {
  if (ctx.path.startsWith("/assets")) {
    await koaSend(ctx, ctx.path, {
      root: fileURLToPath(new URL("./dist/client", import.meta.url)),
    });
    return;
  }
  await next();
});

const webRouter = new WebRouter(
  new URL("./dist/server/routemap.json", import.meta.url),
  {
    client: {
      base: "/",
    },
  }
);

app.use(async (ctx, next) => {
  const webRequest = createWebRequest(ctx.request, ctx.response);
  const webResponse = await webRouter.handler(webRequest);

  await sendWebResponse(ctx.response, webResponse);
  await next();
});

app.listen(9000, () => {
  console.log("http://localhost:9000");
});
