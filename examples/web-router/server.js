import { fileURLToPath } from 'node:url';
import Koa from 'koa';
import koaSend from 'koa-send';
import NodeAdapter from '@web-widget/node';
import connectToKoa from 'koa-connect';
import webRouter from './dist/server/index.js';

const PORT = 9000;
const ORIGIN = `http://localhost:${PORT}`;
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
  defaultOrigin: ORIGIN,
}).middleware;

app.use(connectToKoa(webRouterMiddleware));

const server = app.listen(PORT, () => {
  console.log(ORIGIN);
});

// Export interfaces for testing tools.
export const dispatch = (pathname, ...args) =>
  webRouter.dispatch(`${ORIGIN}${pathname} `, ...args);
export const close = () => server.close();
