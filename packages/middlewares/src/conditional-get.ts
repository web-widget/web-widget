// Based on the code in the MIT licensed `koa-conditional-get` package.
import { defineMiddlewareHandler } from '@web-widget/helpers';
import { Status, STATUS_TEXT } from '@web-widget/helpers/status';
import { fresh } from '@web-widget/helpers/headers';

function isFresh(req: Request, res: Response) {
  const method = req.method;

  // GET or HEAD for weak freshness validation only
  if (method !== 'GET' && method !== 'HEAD') return false;

  const status = res.status;
  // 2xx or 304 as per rfc2616 14.26
  if ((status >= 200 && status < 300) || status === 304) {
    return fresh(req.headers, res.headers);
  }

  return false;
}

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

export interface ConditionalGetOptions {
  retainedHeaders?: string[];
}

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
