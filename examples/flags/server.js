import { fileURLToPath } from 'node:url';
import Koa from 'koa';
import koaSend from 'koa-send';
import NodeAdapter from '@web-widget/node';
import connectToKoa from 'koa-connect';
import webRouter from './dist/server/index.js';

const PORT = Number(process.env.PORT ?? 9000);
const HOST = process.env.HOST ?? '127.0.0.1';
const app = new Koa();

app.use(async (ctx, next) => {
  if (ctx.path.startsWith('/assets')) {
    await koaSend(ctx, ctx.path, {
      root: fileURLToPath(new URL('./dist/client', import.meta.url)),
    });
    return;
  }
  await next();
});

const webRouterMiddleware = new NodeAdapter(webRouter, {
  defaultOrigin: `http://${HOST}:${PORT}`,
}).middleware;

app.use(connectToKoa(webRouterMiddleware));

const server = app.listen(PORT, HOST, () => {
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : PORT;
  console.log(`http://${HOST}:${port}`);
});
