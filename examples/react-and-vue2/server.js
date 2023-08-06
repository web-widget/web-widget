import Koa from "koa";
import koaSend from "koa-send";
import { fileURLToPath } from "node:url";
import WebRouter from "@web-widget/web-router";
import NodeAdapter from "@web-widget/node";
import connectToKoa from "koa-connect";
import routemap from "./dist/server/routemap.js";

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

const webRouter = new WebRouter(routemap, {
  base: "/",
  meta: {
    lang: "en",
    meta: [
      {
        charset: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1.0",
      },
      {
        "http-equiv": "X-Powered-By",
        content: "@web-widget/web-router",
      },
    ],
  },
  experimental: {
    root: fileURLToPath(new URL("./", import.meta.url)),
  },
});

const webRouterMiddlware = new NodeAdapter(webRouter).middlware;

app.use(connectToKoa(webRouterMiddlware));

app.listen(9000, () => {
  console.log("http://localhost:9000");
});
