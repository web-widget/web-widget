import { defineMiddlewareHandler } from '@web-widget/helpers';

export function poweredBy() {
  return defineMiddlewareHandler(
    async function poweredByMiddleware(_ctx, next) {
      const res = await next();
      res.headers.set('X-Powered-By', '@web-widget/web-router');
      return res;
    }
  );
}
