import { createWebRequest } from "@web-widget/koa";
import { fileURLToPath } from "url";
import fs from "node:fs";
import Koa from "koa";
import koaConnect from "koa-connect";
import koaSend from "koa-send";
import path from "node:path";

const isTest = process.env.VITEST;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resolve = (p) => path.resolve(__dirname, p);
const clientRoot = resolve("dist/client");

async function createServer(
  root = process.cwd(),
  isProd = process.env.NODE_ENV === "production"
) {
  let viteServer;
  const app = new Koa();
  const manifest = isProd
    ? JSON.parse(
        fs.readFileSync(resolve("dist/client/ssr-manifest.json"), "utf-8")
      )
    : {};

  if (!isProd) {
    const { createServer } = await import("vite");
    viteServer = await createServer({
      root,
      logLevel: isTest ? "error" : "info",
      server: { middlewareMode: true },
      appType: "custom",
    });

    app.use(koaConnect(viteServer.middlewares));
  } else {
    if (ctx.path.startsWith("/assets")) {
      await koaSend(ctx, ctx.path, { root: clientRoot });
      return;
    }
  }

  let render;
  if (!isProd) {
    render = (await viteServer.ssrLoadModule("/entry-server.ts")).render;
  } else {
    render = (await import("./dist/server/entry-server.js")).render;
  }

  app.use(async (ctx) => {
    try {
      const webRequest = createWebRequest(ctx.request, ctx.response);
      const webResponse = await render(webRequest, manifest);
      if (!isProd) {
        const html = await webResponse.text();
        ctx.type = "text/html";
        ctx.body = await viteServer.transformIndexHtml(ctx.path, html);
      } else {
        // TODO webResponse -> koaResponse
      }
    } catch (e) {
      viteServer && viteServer.ssrFixStacktrace(e);
      console.log(e.stack);
      ctx.throw(500, e.stack);
    }
  });

  return app;
}

if (!isTest) {
  createServer().then((app) => {
    app.listen(9000, () => {
      console.log("http://localhost:9000");
    });
  });
}
