import { fileURLToPath } from 'node:url';
import Koa from 'koa';
import koaSend from 'koa-send';
import NodeAdapter from '@web-widget/node';
import connectToKoa from 'koa-connect';
import start from './dist/server/entry.js';

import routemap from './dist/server/routemap.js';

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

const webRouter = start(routemap, {});

const webRouterMiddleware = new NodeAdapter(webRouter).middleware;

app.use(connectToKoa(webRouterMiddleware));

const server = app.listen(9000, () => {
  console.log('http://localhost:9000');
});

// Export interfaces for testing tools.
export const request = (pathname, ...args) =>
  webRouter.request(`http://localhost:9000${pathname} `, ...args);
export const close = () => server.close();
