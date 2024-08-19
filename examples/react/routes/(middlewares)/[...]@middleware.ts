import { defineMiddlewareHandler } from '@web-widget/helpers';

export const handler = defineMiddlewareHandler(
  async function handler(_ctx, next) {
    const resp = await next();
    resp.headers.set('X-Powered-By', '@web-widget/web-router');
    return resp;
  }
);
