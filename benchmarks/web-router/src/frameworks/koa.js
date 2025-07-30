/**
 * @fileoverview Koa Framework Adapter
 */

import Koa from 'koa';
import Router from '@koa/router';
import { createServer } from 'node:http';

export default {
  name: 'koa',
  createApp: () => {
    const app = new Koa();
    const router = new Router();

    // Add error handling
    app.use(async (ctx, next) => {
      try {
        await next();
      } catch (err) {
        ctx.status = err.status || 500;
        ctx.body = { error: err.message };
      }
    });

    return { app, router };
  },
  registerRoute: ({ app, router }, route, expected, description) => {
    router.get(route, (ctx) => {
      if (expected) {
        if (expected.contentType.includes('application/json')) {
          ctx.type = 'application/json';
          ctx.body = JSON.parse(expected.content);
        } else {
          ctx.type = expected.contentType;
          ctx.body = expected.content;
        }
      } else {
        ctx.body = description;
      }
    });
  },
  setupMiddleware: ({ app, router }) => {
    app.use(router.routes());
    app.use(router.allowedMethods());
    return app;
  },
  startServer: async (appOrConfig) => {
    // Handle both direct app and { app, router } config
    const app = appOrConfig.app || appOrConfig;

    return new Promise((resolve) => {
      const server = createServer(app.callback());
      server.listen(0, () => {
        const address = server.address();
        const port = typeof address === 'object' ? address?.port : 0;
        const baseUrl = `http://localhost:${port}`;
        // Server started successfully
        resolve({ server, baseUrl });
      });
    });
  },
};
