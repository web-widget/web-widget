// Based on the code in the MIT licensed `koa-conditional-get` package.
import { defineMiddlewareHandler } from '@web-widget/helpers';
import { Status, STATUS_TEXT } from '@web-widget/helpers/status';
import { isFresh } from './utils/is-fresh';

export default function conditionalGet() {
  return defineMiddlewareHandler(
    async function conditionalGetMiddleware(ctx, next) {
      const res = await next();
      if (isFresh(ctx.request, res)) {
        return new Response(null, {
          status: Status.NotModified,
          statusText: STATUS_TEXT[Status.NotModified],
          headers: res.headers,
        });
      } else {
        return res;
      }
    }
  );
}
