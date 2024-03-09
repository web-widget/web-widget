// Based on the code in the MIT licensed `koa-cash` package.
import {
  defineMiddlewareHandler,
  type MiddlewareContext,
} from '@web-widget/helpers';
import { Status, STATUS_TEXT } from '@web-widget/helpers/status';
import { isFresh } from './utils/is-fresh';

declare module '@web-widget/schema' {
  interface RouteConfig {
    cache?: Partial<CacheOptions> | boolean;
  }
  interface RouteState {
    $cache?: {
      maxAge: number;
    };
  }
}

export interface CacheOptions {
  /** Default max age (in milliseconds) for the cache if not set via await ctx.cashed(maxAge). */
  maxAge?: number;

  /** If a truthy value is passed, then X-Cached-Response header will be set as HIT when response is served from the cache. This value is false by default. */
  setCachedHeader?: boolean;

  /**
   * If an object is passed, then add extra HTTP method caching. This value is empty by default. But GET and HEAD are enabled.
   * Eg: `{ POST: true }`
   */
  methods?: Record<string, boolean>;

  /**
   * A hashing function. By default, it's:
   * function hash(ctx) {
   *   return ctx.request.url;
   * }
   */
  hash?: (ctx: MiddlewareContext) => string;

  /**
   * Whether to disable cache middleware running. By default, it's:
   * function disable(ctx) {
   *   return false;
   * }
   */
  disable?: (ctx: MiddlewareContext) => boolean;

  /**
   * Get a value from a store. Must return a Promise, which returns the cache's value, if any.
   * Note that all the maxAge stuff must be handled by you. This module makes no opinion about it.
   */
  get: (key: string, maxAge?: number) => Promise<any>;

  /**
   * Set a value to a store. Must return a Promise.
   */
  set: (key: string, value: any, maxAge?: number) => Promise<void>;
}

// methods we cache
const defaultMethods = {
  HEAD: true,
  GET: true,
};

type CacheValue = {
  body: string | null;
  contentType: string | null;
  lastModified: string | null;
  etag: string | null;
};

async function getCache(
  ctx: MiddlewareContext,
  {
    maxAge = 0,
    get,
    methods = defaultMethods,
    setCachedHeader,
    hash = function (ctx) {
      return ctx.request.url;
    },
  }: CacheOptions
) {
  if (!methods[ctx.request.method]) {
    return null;
  }

  const cacheKey = hash(ctx);
  const cacheValue: CacheValue | undefined = await get(cacheKey, maxAge);

  const body = cacheValue?.body;
  if (!body) {
    // tell the upstream middleware to cache this response
    // eslint-disable-next-line no-param-reassign
    ctx.state.$cache = {
      maxAge,
    };
    return null;
  }

  const cachedHeaders = new Headers({
    'Content-Type': cacheValue.contentType ?? '',
  });

  if (cacheValue.lastModified) {
    cachedHeaders.set('Last-Modified', cacheValue.lastModified);
  }

  if (cacheValue.etag) {
    cachedHeaders.set('ETag', cacheValue.etag);
  }

  if (setCachedHeader) {
    cachedHeaders.set('X-Cached-Response', 'HIT');
  }

  const cachedResponse = new Response(body, {
    status: Status.OK,
    statusText: STATUS_TEXT[Status.OK],
    headers: cachedHeaders,
  });

  if (isFresh(ctx.request, cachedResponse)) {
    return new Response(null, {
      status: Status.NotModified,
      statusText: STATUS_TEXT[Status.NotModified],
      headers: cachedHeaders,
    });
  } else {
    return cachedResponse;
  }
}

export default function cache(options: CacheOptions) {
  const methods = Object.assign({}, defaultMethods, options.methods);

  const { get } = options;
  const { set } = options;

  if (!get) throw new Error('.get not defined');
  if (!set) throw new Error('.set not defined');

  return defineMiddlewareHandler(async function cacheMiddleware(ctx, next) {
    if (!ctx.module || !ctx.module?.config?.cache) {
      return next();
    }

    const routeConfig = ctx.module.config.cache;
    const disable =
      (typeof routeConfig === 'object' && routeConfig.disable) ??
      options.disable;

    if (disable && disable(ctx)) {
      return next();
    }

    const resolveOptions = {
      methods,
      maxAge: 0,
      hash(ctx: MiddlewareContext) {
        return ctx.request.url;
      },
      ...options,
      ...(routeConfig === true ? {} : routeConfig),
    };
    const cache = await getCache(ctx, resolveOptions);

    if (cache) {
      return cache;
    }

    const res = await next();
    // vary(res.headers, 'Accept-Encoding');

    // check for HTTP caching just in case
    if (!ctx.state.$cache) {
      if (isFresh(ctx.request, res)) {
        return new Response(null, {
          status: Status.NotModified,
          statusText: STATUS_TEXT[Status.NotModified],
          headers: res.headers,
        });
      }
      return res;
    }

    // cache the response

    // only cache GET/HEAD 200s
    if (res.status !== Status.OK) {
      return res;
    }

    if (!methods[ctx.request.method]) {
      return res;
    }

    if (!res.body) {
      return res;
    }

    const cacheValue: CacheValue = {
      body: await res.clone().text(),
      contentType: res.headers.get('Content-Type'),
      lastModified: res.headers.get('Last-Modified'),
      etag: res.headers.get('etag'),
    };

    const cacheKey = resolveOptions.hash(ctx);
    await set(
      cacheKey,
      cacheValue,
      ctx.state.$cache?.maxAge ?? resolveOptions.maxAge
    );

    if (isFresh(ctx.request, res)) {
      return new Response(null, {
        status: Status.NotModified,
        statusText: STATUS_TEXT[Status.NotModified],
        headers: res.headers,
      });
    } else {
      return res;
    }
  });
}
