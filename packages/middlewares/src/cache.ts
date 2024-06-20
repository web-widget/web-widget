import type { MiddlewareNext, RouteConfig } from '@web-widget/helpers';
import { defineMiddlewareHandler } from '@web-widget/helpers';
import {
  stringifyResponseCacheControl,
  type ResponseCacheControl,
} from '@web-widget/helpers/headers';
import { createFetch } from '@web-widget/shared-cache';
import type {
  Cache,
  CacheStorage,
  CacheStatus,
  CacheKeyRules,
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

export type CacheOptions = {
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
};

export default function cache(options: CacheOptions) {
  const defaultOptions = {
    cacheName: 'default',
    ignoreRequestCacheControl: true,
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
      ignoreRequestCacheControl,
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
      setCacheStatus(response.headers, 'BYPASS');
      return response;
    }

    if (!caches) {
      throw new Error('.caches not defined.');
    }

    const vary = Array.isArray(varyOption)
      ? varyOption.join(', ')
      : varyOption ?? '';
    const signal =
      typeof signalOption === 'function' ? signalOption() : signalOption;
    const cache = await caches.open(cacheName);
    const fetch = nextToFetch(cache, next);

    return fetch(
      ignoreRequestCacheControl ? removeRequestCacheControl(request) : request,
      {
        sharedCache: {
          cacheControlOverride: cacheControl,
          varyOverride: vary,
          cacheKeyRules,
        },
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

function removeRequestCacheControl(request: Request) {
  const headers = new Headers(request.headers);
  headers.delete('cache-control');
  headers.delete('pragma');
  return new Request(request, {
    headers,
  });
}

function errorToResponse(error: any = {}) {
  const status =
    typeof error.status === 'number'
      ? error.status
      : error.name === 'TimeoutError'
        ? 504
        : 500;
  const statusText = error.statusText ?? error.name ?? '';
  return Response.json(
    {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    {
      status,
      statusText,
      headers: {
        // NOTE: Web Router supports this custom header to transform error responses
        'x-transform-error': 'true',
      },
    }
  );
}

function nextToFetch(cache: Cache, next: MiddlewareNext) {
  return createFetch(cache, {
    fetch: async (input, init) => {
      const request = new Request(input, init);

      if (!request.signal) {
        try {
          return next();
        } catch (error) {
          return errorToResponse(error);
        }
      }

      const signal = request.signal;
      let isAborted = signal.aborted;

      if (isAborted) {
        return errorToResponse(signal.reason);
      }

      return new Promise((resolve) => {
        const onAbort = () => {
          isAborted = true;
          resolve(errorToResponse(signal.reason));
        };

        let response;

        try {
          response = next();
        } catch (error) {
          resolve(errorToResponse(error));
        }

        if (response instanceof Promise) {
          response.then(
            (response) => {
              signal.removeEventListener('abort', onAbort);
              if (isAborted) return;
              resolve(response);
            },
            (error) => {
              signal.removeEventListener('abort', onAbort);
              resolve(errorToResponse(error));
            }
          );
        }

        signal.addEventListener('abort', onAbort);
      });
    },
  });
}
