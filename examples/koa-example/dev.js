import { createServer as createViteServer } from 'vite';
import { createWebRequest } from "@web-widget/koa";
import { fileURLToPath } from 'url';
import fs from 'node:fs';
import Koa from 'koa';
import koaConnect from "koa-connect";
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function createServer() {
  const app = new Koa();

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  app.use(koaConnect(vite.middlewares));

  app.use(async ctx => {
    try {
      const { render } = await viteServer.ssrLoadModule('/entry-server.ts');
      const webRequest = createWebRequest(ctx.request, ctx.response);
      const webResponse = render(webRequest, {});
      const html = await webResponse.text();
      ctx.type = 'text/html';
      ctx.body = await viteServer.transformIndexHtml(ctx.path, html);
    } catch (e) {
      viteServer && viteServer.ssrFixStacktrace(e);
      console.log(e.stack);
      ctx.throw(500, e.stack);
    }
  });

  app.listen(9000, () => {
      console.log('server is listening in 9000');
  });
}

createServer()