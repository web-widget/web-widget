import { defineMiddlewareHandler } from '@web-widget/helpers';
import {
  stringifyResponseCacheControl,
  type ResponseCacheControl,
} from '@web-widget/helpers/headers';
import { createFetch } from '@web-widget/shared-cache';
import type {
  CacheStorage,
  CacheStatus,
  CacheKeyRules,
} from '@web-widget/shared-cache';

declare module '@web-widget/schema' {
  interface RouteConfig {
    /** Cache middleware options. */
    cache?: Partial<CacheOptions> | boolean;
  }
}

export type CacheOptions = {
  /**
   * Override HTTP `Cache-Control` header.
   * @see https://developer.mozilla.org/docs/Web/HTTP/Headers/Cache-Control
   */
  cacheControl?:
    | null
    | string
    | ResponseCacheControl
    | ((request: Request) => Promise<null | string | ResponseCacheControl>);

  /**
   * Override HTTP `Vary` header.
   * @see https://developer.mozilla.org/docs/Web/HTTP/Headers/Vary
   */
  vary?:
    | null
    | string
    | string[]
    | ((request: Request) => Promise<null | string | string[]>);

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
    const vary = await getVaryOption(resolveOptions.vary, request);
    const cacheControl = await getCacheControlOption(
      resolveOptions.cacheControl,
      request
    );

    if (!cacheControl) {
      const response = await next();
      setCacheStatus(response.headers, 'BYPASS');
      return response;
    }

    const { cacheName, cacheKeyRules, caches, ignoreRequestCacheControl } =
      resolveOptions;
    const cache = await caches.open(cacheName);

    const fetch = createFetch(cache, {
      fetch: async () => next(),
    });

    if (ignoreRequestCacheControl) {
      const headers = new Headers(request.headers);
      headers.delete('cache-control');
      headers.delete('pragma');
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

async function getVaryOption(
  option: CacheOptions['vary'],
  request: Request
): Promise<string> {
  const value = typeof option === 'function' ? await option(request) : option;
  return Array.isArray(value) ? value.join(', ') : value ?? '';
}

async function getCacheControlOption(
  option: CacheOptions['cacheControl'],
  request: Request
): Promise<string> {
  const value = typeof option === 'function' ? await option(request) : option;

  return !value
    ? ''
    : typeof value === 'object'
      ? stringifyResponseCacheControl(value)
      : value;
}
