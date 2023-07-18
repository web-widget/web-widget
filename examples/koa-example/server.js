import Koa from "koa";
import koaSend from "koa-send";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebServer from "@web-widget/web-server";
import { createWebRequest, sendWebResponse } from "@web-widget/koa";
import manifest from "./dist/server/manifest.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const resolve = (p) => path.resolve(__dirname, p);
const clientRoot = resolve("dist/client");

const app = new Koa();

app.use(async (ctx, next) => {
  if (ctx.path.startsWith("/assets")) {
    await koaSend(ctx, ctx.path, { root: clientRoot });
    return;
  }
  await next();
});

const webServer = new WebServer(manifest);
app.use(async (ctx, next) => {
  const webRequest = createWebRequest(ctx.request, ctx.response);
  const webResponse = await webServer.handler(webRequest);

  await sendWebResponse(ctx.response, webResponse);
  await next();
});

app.listen(9000, () => {
  console.log("http://localhost:9000");
});
