import Koa from "koa";
import koaSend from "koa-send";
import path from "node:path";
import { fileURLToPath } from "node:url";

import middleware from "./dist/server/koa-middleware.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const resolve = (p) => path.resolve(__dirname, p);
const clientRoot = resolve("dist/client");

const app = new Koa();

app.use(async (ctx, next) => {
  if (ctx.path.startsWith("/assets")) {
    await koaSend(ctx, ctx.path, { root: clientRoot });
    return;
  }
  await middleware(ctx, next);
});

app.listen(9000, () => {
  console.log("http://localhost:9000");
});
