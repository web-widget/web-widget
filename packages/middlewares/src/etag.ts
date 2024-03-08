// Based on the code in the MIT licensed `koa-etag` package.
import { defineMiddlewareHandler } from '@web-widget/helpers';
import { etag as calculate } from '@web-widget/helpers/headers';

export type EtagOptions = Parameters<typeof calculate>[1];

export default function etag(options?: EtagOptions) {
  return defineMiddlewareHandler(async function etagHandler(_ctx, next) {
    const res = await next();

    if (res.headers.get('ETag')) {
      return res;
    }

    if (((res.status / 100) | 0) !== 2) {
      return res;
    }

    const entity = await res.clone().text();

    if (entity) {
      const tag = await calculate(entity, options);
      res.headers.set('ETag', tag);
    }

    return res;
  });
}
