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
   *   method: true,
   *   pathname: true,
   *   search: true,
   * }
   * ```
   */
  cacheKeyRules?: CacheKeyRules;

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

    let request = context.request;
    const vary = getVaryOption(resolveOptions.vary, request);
    const cacheControl = getCacheControlOption(
      resolveOptions.cacheControl,
      request
    );
    const { cacheName, cacheKeyRules, caches, ignoreRequestCacheControl } =
      resolveOptions;
    const cache = await caches.open(cacheName);

    const fetch = createFetch(cache, {
      async fetch(input, init) {
        context.request = new Request(input, init);
        return next();
      },
    });

    if (ignoreRequestCacheControl) {
      const headers = new Headers(request.headers);
      headers.delete('cache-control');
      request = new Request(request, {
        headers,
      });
    }

    return fetch(request, {
      sharedCache: {
        cacheControlOverride: cacheControl,
        varyOverride: vary,
        cacheKeyRules,
      },
    });
  });
}

function setCacheStatus(headers: Headers, status: CacheStatus) {
  headers.set('x-cache-status', status);
}

function getVaryOption(
  option: CacheOptions['vary'],
  request: Request
): string | undefined {
  const value = typeof option === 'function' ? option(request) : option;
  return Array.isArray(value) ? value.join(', ') : value;
}

function getCacheControlOption(
  option: CacheOptions['cacheControl'],
  request: Request
): string | undefined {
  const value = typeof option === 'function' ? option(request) : undefined;
  return typeof value === 'string'
    ? value
    : value && typeof value === 'object'
      ? stringifyResponseCacheControl(value)
      : undefined;
}
