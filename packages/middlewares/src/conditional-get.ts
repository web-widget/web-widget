// Based on the code in the MIT licensed `koa-conditional-get` package.
import { defineMiddlewareHandler } from '@web-widget/helpers';
import { Status, STATUS_TEXT } from '@web-widget/helpers/status';
import { isFresh } from './utils/is-fresh';

/**
 * Default headers to pass through on 304 responses. From the spec:
 * > The response must not contain a body and must include the headers that
 * > would have been sent in an equivalent 200 OK response: Cache-Control,
 * > Content-Location, Date, ETag, Expires, and Vary.
 */
const RETAINED_304_HEADERS = [
  'cache-control',
  'content-location',
  'date',
  'etag',
  'expires',
  'vary',
];

export type ConditionalGetOptions = {
  retainedHeaders?: string[];
};

export default function conditionalGet(options: ConditionalGetOptions = {}) {
  const retainedHeaders = options?.retainedHeaders ?? RETAINED_304_HEADERS;
  return defineMiddlewareHandler(
    async function conditionalGetMiddleware(ctx, next) {
      const res = await next();
      if (isFresh(ctx.request, res)) {
        res.headers.forEach((_, key) => {
          if (!retainedHeaders.includes(key.toLowerCase())) {
            res.headers.delete(key);
          }
        });
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
