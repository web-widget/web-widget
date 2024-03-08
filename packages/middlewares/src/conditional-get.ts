// Based on the code in the MIT licensed `koa-conditional-get` package.
import { defineMiddlewareHandler } from '@web-widget/helpers';
import { isFresh } from './utils/is-fresh';

export default function conditionalGet() {
  return defineMiddlewareHandler(
    async function conditionalGetMiddleware(ctx, next) {
      const res = await next();
      if (isFresh(ctx.request, res)) {
        return new Response(null, {
          status: 304,
          headers: res.headers,
        });
      } else {
        return res;
      }
    }
  );
}
