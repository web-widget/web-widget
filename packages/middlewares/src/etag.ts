// Based on the code in the MIT licensed `koa-etag` package.
import { defineMiddlewareHandler } from '@web-widget/helpers';
import { etag as calculate } from '@web-widget/helpers/headers';

export type EtagOptions = Parameters<typeof calculate>[1];

export default function etag(options?: EtagOptions) {
  return defineMiddlewareHandler(async function etagMiddleware(_ctx, next) {
    const res = await next();

    if (res.headers.get('ETag')) {
      return res;
    }

    if (((res.status / 100) | 0) !== 2) {
      return res;
    }

    // Responses marked `no-store` cannot be cached by any cache (RFC 7234
    // §5.2.2.3), so conditional requests are impossible and an ETag serves no
    // purpose. This also covers progressive (streaming) responses, which are
    // declared `no-store` at the rendering layer — computing an ETag would
    // require buffering the entire body and defeat streaming.
    if (res.headers.get('cache-control')?.toLowerCase().includes('no-store')) {
      return res;
    }

    const entity = res.clone().body || '';

    if (entity) {
      const tag = await calculate(entity, options);
      res.headers.set('ETag', tag);
    }

    return res;
  });
}
