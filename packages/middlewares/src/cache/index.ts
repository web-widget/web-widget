import { defineMiddlewareHandler } from '@web-widget/helpers';
import {
  stringifyResponseCacheControl,
  type ResponseCacheControlOptions,
} from '@web-widget/helpers/headers';
import { createFetch } from '@web-widget/shared-cache';
import type {
  CacheStorage,
  CacheStatus,
  CacheKeyRules,
  CacheKeyPartDefiners,
} from '@web-widget/shared-cache';

declare module '@web-widget/schema' {
  interface RouteConfig {
    cache?: Partial<CacheOptions> | boolean;
  }
}

export type CacheOptions = {
  /**
   * Override HTTP `Cache-Control` header.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
   */
  cacheControl?:
    | string
    | ResponseCacheControlOptions
    | ((request: Request) => string | ResponseCacheControlOptions);

  /**
   * Override HTTP `Vary` header.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Vary
   */
  vary?: string | string[] | ((request: Request) => string | string[]);

  /**
   * Ignore the `Cache-Control` header in the request.
   * @default true
   */
  ignoreRequestCacheControl?: boolean;

  /**
   * Create custom cache keys.
   * @default
   * ```json
   * {
   *   host: true,
   *   method: { include: ['GET', 'HEAD'] },
   *   pathname: true,
   *   search: true,
   * }
   * ```
   */
  cacheKeyRules?: CacheKeyRules;

  /**
   * Define custom parts for cache keys.
   */
  cacheKeyPartDefiners?: CacheKeyPartDefiners;

  /**
   * Cache name.
   * @default 'default'
   */
  cacheName?: string;

  /**
   * Cache storage.
   */
  caches: CacheStorage;
};

export default function cache(options: CacheOptions) {
  const { caches } = options;

  if (!caches) throw new Error('.caches not defined');

  const defaultOptions = {
    cacheName: 'default',
    ignoreRequestCacheControl: true,
    ...options,
  };

  return defineMiddlewareHandler(async function cacheMiddleware(context, next) {
    const rawConfig = context?.module?.config?.cache;
    if (rawConfig === false) {
      const response = await next();
      setCacheStatus(response.headers, 'BYPASS');
      return response;
    }

    const routeConfig: Partial<CacheOptions> =
      rawConfig === true ? {} : rawConfig ?? {};
    const resolveOptions = {
      ...defaultOptions,
      ...routeConfig,
    };

    const request = context.request;
    const varyRawValue =
      typeof resolveOptions.vary === 'function'
        ? resolveOptions.vary(request)
        : resolveOptions.vary;
    const vary = Array.isArray(varyRawValue)
      ? varyRawValue.join(', ')
      : varyRawValue;
    const cacheControlRawValue =
      typeof resolveOptions.cacheControl === 'function'
        ? resolveOptions.cacheControl(request)
        : undefined;
    const cacheControl =
      typeof cacheControlRawValue === 'string'
        ? cacheControlRawValue
        : cacheControlRawValue
          ? stringifyResponseCacheControl(cacheControlRawValue)
          : undefined;
    const {
      cacheName,
      cacheKeyRules,
      caches,
      ignoreRequestCacheControl: ignoreCacheControl,
    } = resolveOptions;
    const cache = await caches.open(cacheName);

    const fetch = createFetch(cache, {
      async fetch(input, init) {
        const request = new Request(input, init);
        context.request = request;
        return next();
      },
    });

    return fetch(request, {
      sharedCache: {
        cacheControlOverride: cacheControl,
        varyOverride: vary,
        cacheKeyRules,
        ignoreCacheControl,
      },
    });
  });
}

function setCacheStatus(headers: Headers, status: CacheStatus) {
  headers.set('x-cache-status', status);
}
