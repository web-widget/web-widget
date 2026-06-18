import type { RouteConfig } from '@web-widget/helpers';
import { defineMiddlewareHandler } from '@web-widget/helpers';
import {
  stringifyResponseCacheControl,
  type ResponseCacheControl,
} from '@web-widget/helpers/headers';
import { createCacheHandler } from '@web-widget/shared-cache';
import type {
  CacheOriginContext,
  CacheStorage,
  CacheKeyRules,
  CacheStatus,
} from '@web-widget/shared-cache';

declare module '@web-widget/schema' {
  interface RouteConfig {
    /** Cache middleware options. */
    cache?: CacheRouteOptions;
  }
}

export type CacheRouteOptions =
  | Partial<CacheOptions>
  | boolean
  | ((request: Request) => Promise<Partial<CacheOptions | boolean>>);

export interface CacheOptions {
  /**
   * Override HTTP `Cache-Control` header.
   * @see https://developer.mozilla.org/docs/Web/HTTP/Headers/Cache-Control
   */
  cacheControl?: null | string | ResponseCacheControl;

  /**
   * Override HTTP `Vary` header.
   * @see https://developer.mozilla.org/docs/Web/HTTP/Headers/Vary
   */
  vary?: null | string | string[];

  /**
   * Ignore the `Cache-Control` header in the request.
   * @default true
   */
  ignoreRequestCacheControl?: boolean;

  /**
   * @default false
   */
  ignoreVary?: boolean;

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
  caches?: CacheStorage;

  /**
   * Signal an abort during cache revalidate.
   */
  signal?: AbortSignal | (() => AbortSignal);

  /**
   * Expose the computed cache key via the `x-cache-key` response header.
   * @default false
   */
  debugCacheKey?: boolean;
}

export default function cache(options?: CacheOptions) {
  const defaultOptions = {
    cacheName: 'default',
    ignoreRequestCacheControl: true,
    ignoreVary: false,
    ...options,
  };

  return defineMiddlewareHandler(async function cacheMiddleware(context, next) {
    const request = context.request;
    const routeCacheConfig = await getRouteCacheConfig(
      context?.module?.config?.cache,
      request
    );

    if (routeCacheConfig === false) {
      const response = await next();
      setCacheStatus(response.headers, 'BYPASS');
      return response;
    }

    const routeOptions = routeCacheConfig === true ? {} : routeCacheConfig;
    const {
      cacheControl: cacheControlOption,
      cacheKeyRules,
      cacheName,
      caches,
      debugCacheKey,
      ignoreRequestCacheControl,
      ignoreVary,
      signal: signalOption,
      vary: varyOption,
    } = {
      ...defaultOptions,
      ...routeOptions,
    };

    const cacheControl =
      cacheControlOption && typeof cacheControlOption === 'object'
        ? stringifyResponseCacheControl(cacheControlOption)
        : cacheControlOption;

    if (!cacheControl) {
      const response = await next();
      setCacheStatus(response.headers, 'DYNAMIC');
      return response;
    }

    if (!caches) {
      throw new Error('.caches not defined.');
    }

    const vary = Array.isArray(varyOption)
      ? varyOption.join(', ')
      : (varyOption ?? '');
    const signal =
      typeof signalOption === 'function' ? signalOption() : signalOption;
    const cache = await caches.open(cacheName);
    const waitUntil = context.waitUntil.bind(context);

    // NOTE: Use middleware-friendly cache resolution instead of wrapping `next()` in
    // `createFetch`. On cache miss, origin throws propagate to the framework `onError`
    // handler. Revalidation failures are converted to 5xx inside shared-cache for
    // `stale-if-error` / `stale-while-revalidate` semantics.
    return createCacheHandler(cache, {
      cacheControlOverride: cacheControl,
      cacheKeyRules,
      debugCacheKey,
      ignoreRequestCacheControl,
      ignoreVary,
      varyOverride: vary,
    }).resolve(
      request,
      // The origin request from shared-cache is ignored; `next()` uses middleware context.
      (_req: Request, _ctx: CacheOriginContext) => next(),
      {
        waitUntil,
        signal,
      }
    );
  });
}

async function getRouteCacheConfig(
  rawConfig: RouteConfig['cache'],
  request: Request
): Promise<Partial<CacheOptions> | boolean> {
  if (typeof rawConfig === 'function') {
    return await rawConfig(request);
  }
  return rawConfig ?? {};
}

function setCacheStatus(headers: Headers, status: CacheStatus) {
  headers.set('x-cache-status', status);
}
