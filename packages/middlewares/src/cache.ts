import type { MiddlewareNext } from '@web-widget/helpers';
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
    cache?:
      | Partial<CacheOptions>
      | boolean
      | ((request: Request) => Promise<Partial<CacheOptions>>);
  }
}

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
  caches: CacheStorage;

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
    const rawConfig = context?.module?.config?.cache;
    if (rawConfig === false) {
      const response = await next();
      setCacheStatus(response.headers, 'BYPASS');
      return response;
    }

    const request = context.request;
    const routeConfig: Partial<CacheOptions> =
      rawConfig === true
        ? {}
        : typeof rawConfig === 'function'
          ? await rawConfig(request)
          : rawConfig ?? {};

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
      ...routeConfig,
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

function nextToFetch(cache: Cache, next: MiddlewareNext) {
  const errorToResponse = (error: any = {}) => {
    const body = error.message ?? null;
    const status =
      typeof error.status === 'number'
        ? error.status
        : error.name === 'TimeoutError'
          ? 504
          : 500;
    const statusText = error.statusText ?? '';
    return new Response(body, {
      status,
      statusText,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  };

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
