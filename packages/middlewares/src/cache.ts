import type { MiddlewareNext } from '@web-widget/helpers';
import { defineMiddlewareHandler } from '@web-widget/helpers';
import { Status, STATUS_TEXT } from '@web-widget/helpers/status';
import { cacheControl } from '@web-widget/helpers/headers';

declare module '@web-widget/schema' {
  interface RouteConfig {
    cache?: Partial<CacheOptions> | boolean;
  }
}

export interface CacheOptions {
  /**
   * maxAge:
   * The `max-age=N` response directive indicates that the response
   * remains fresh until N seconds after the response is generated.
   */
  maxAge?: number;

  /**
   * sMaxAge:
   * The `s-maxage` response directive indicates how long the response
   * remains fresh in a shared cache. The s-maxage directive is ignored
   * by private caches, and overrides the value specified by the max-age
   * directive or the Expires header for shared caches, if they are present.
   */
  sMaxAge?: number;

  /**
   * staleIfError:
   * The `stale-if-error` response directive indicates that the cache can
   * reuse a stale response when an upstream server generates an error,
   * or when the error is generated locally. Here, an error is considered
   * any response with a status code of 500, 502, 503, or 504.
   */
  staleIfError?: number;

  /**
   * staleWhileRevalidate:
   * The `stale-while-revalidate` response directive indicates that the cache
   * could reuse a stale response while it revalidates it to a cache.
   */
  staleWhileRevalidate?: number;

  /**
   * WARN: This option is only used for unit testing.
   * If a truthy value is passed, then the cache will be refreshed in the background.
   * This value defaults to true.
   */
  backgroundRefresh?: boolean;

  /**
   * If a truthy value is passed, the "X-Cached-Response" header is set.
   * This value defaults to false.
   */
  setCachedResponseHeader?: boolean;

  /**
   * If a truthy value is passed, then the "Cache-Control" ans "Age" header are set.
   * This value defaults to false.
   */
  setCacheControlHeader?: boolean;

  /**
   * If an object is passed, then add extra HTTP method caching.
   * This value defaults to `[ 'GET', 'HEAD' ]`.
   */
  allowMethods?: string[];

  /**
   * Status codes that allow caching of responses.
   * This value defaults to `[ 200, 206, 301, 302, 303, 404, 410 ]`.
   */
  allowStatus?: number[];

  /**
   * A hashing function. By default, it's:
   * (req) => req.url
   */
  key?: (req: Request) => string;

  /**
   * Strategies to use for caching. By default, it's:
   * (req) => 'stale-while-revalidate'
   */
  strategies?: (req: Request) => Strategies;

  /**
   * Get a value from a store. Must return a Promise, which returns the cache's value, if any.
   * Note that all maxAge stuff must be handled by you, it is in seconds. This module does not express any opinion on this.
   */
  get: (key: string, maxAge?: number) => Promise<any>;

  /**
   * Set a value to a store. Must return a Promise.
   */
  set: (key: string, value: any, maxAge?: number) => Promise<void>;
}

type Strategies =
  | 'stale-while-revalidate'
  | 'cache-first'
  | 'network-first'
  | 'network-only'
  | 'cache-only';

export const STALE_WHILE_REVALIDATE: Strategies = 'stale-while-revalidate';
export const CACHE_FIRST: Strategies = 'cache-first';
export const NETWORK_FIRST: Strategies = 'network-first';
export const NETWORK_ONLY: Strategies = 'network-only';
export const CACHE_ONLY: Strategies = 'cache-only';

const DEFAULT_STRATEGIES: Strategies = STALE_WHILE_REVALIDATE;
const DEFAULT_ALLOW_METHODS: string[] = ['GET', 'HEAD'];

// fastly: 200, 203, 300, 301, 302, 404, or 410
// fastly: https://www.fastly.com/documentation/guides/concepts/edge-state/cache/cache-freshness/
//
// cloudflare: 200, 206, 301, 302, 303, 404, or 410
// cloudflare: https://developers.cloudflare.com/cache/how-to/configure-cache-status-code/#edge-ttl
const DEFAULT_ALLOW_STATUS: number[] = [200, 206, 301, 302, 303, 404, 410];

export type CacheValue = {
  body: string | null;
  contentType: string | null;
  etag: string | null;
  lastModified: string | null;

  creationTime: number;
  maxAge?: number;
  sMaxAge?: number;
  staleIfError?: number;
  staleWhileRevalidate?: number;
};

export async function isStale(
  key: string,
  { get }: Required<Pick<CacheOptions, 'get'>>
) {
  const cacheValue: CacheValue | undefined = await get(key);

  if (!cacheValue) {
    return true;
  }

  const sMaxAge = cacheValue.sMaxAge ?? cacheValue.maxAge;
  if (sMaxAge !== undefined) {
    return cacheValue.creationTime + sMaxAge < Date.now();
  } else {
    return true;
  }
}

export async function getCache(
  key: string,
  {
    get,
    setCacheControlHeader,
    setCachedResponseHeader,
  }: Required<
    Pick<
      CacheOptions,
      'get' | 'setCacheControlHeader' | 'setCachedResponseHeader'
    >
  >
) {
  const cacheValue: CacheValue | undefined = await get(key);

  if (!cacheValue) {
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

  if (setCachedResponseHeader) {
    cachedHeaders.set('X-Cached-Response', 'HIT');
  }

  if (setCacheControlHeader) {
    const now = Date.now();
    const {
      creationTime,
      maxAge,
      sMaxAge,
      staleIfError,
      staleWhileRevalidate,
    } = cacheValue;

    cachedHeaders.set('Age', String(Math.round((now - creationTime) / 1000)));

    const control: string[] = [];

    if (maxAge !== undefined) {
      control.push(`max-age=${Math.round(Math.max(0, maxAge / 1000))}`);
    }

    if (sMaxAge !== undefined) {
      control.push(`s-maxage=${Math.round(Math.max(0, sMaxAge / 1000))}`);
    }

    if (staleIfError !== undefined) {
      control.push(`stale-if-error=${Math.round(staleIfError / 1000)}`);
    }

    if (staleWhileRevalidate !== undefined) {
      control.push(
        `stale-while-revalidate=${Math.round(staleWhileRevalidate / 1000)}`
      );
    }

    cacheControl(cachedHeaders, control.join(', '));
  }

  const cachedResponse = new Response(cacheValue.body, {
    status: Status.OK,
    statusText: STATUS_TEXT[Status.OK],
    headers: cachedHeaders,
  });

  return cachedResponse;
}

export async function setCache(
  key: string,
  res: Response,
  {
    maxAge,
    set,
    sMaxAge,
    staleIfError,
    staleWhileRevalidate,
    allowStatus,
  }: Required<
    Pick<
      CacheOptions,
      | 'maxAge'
      | 'set'
      | 'sMaxAge'
      | 'staleIfError'
      | 'staleWhileRevalidate'
      | 'allowStatus'
    >
  >
) {
  if (!allowStatus.includes(res.status)) {
    return false;
  }

  const creationTime = Date.now();
  const cacheValue: CacheValue = {
    body: await res.clone().text(),
    contentType: res.headers.get('Content-Type'),
    lastModified: res.headers.get('Last-Modified'),
    etag: res.headers.get('ETag'),

    creationTime,
    maxAge: maxAge * 1000,
    sMaxAge: sMaxAge * 1000,
    staleIfError: staleIfError * 1000,
    staleWhileRevalidate: staleWhileRevalidate * 1000,
  };

  await set(key, cacheValue, (sMaxAge ?? maxAge) + (staleWhileRevalidate ?? 0));

  return true;
}

async function callNextAndSetCache(
  key: string,
  next: MiddlewareNext,
  {
    maxAge,
    set,
    setCacheControlHeader,
    sMaxAge,
    staleIfError,
    staleWhileRevalidate,
    allowStatus,
  }: Required<
    Pick<
      CacheOptions,
      | 'maxAge'
      | 'set'
      | 'setCacheControlHeader'
      | 'sMaxAge'
      | 'staleIfError'
      | 'staleWhileRevalidate'
      | 'allowStatus'
    >
  >
) {
  const res = await next();

  const ok = await setCache(key, res, {
    maxAge,
    set,
    sMaxAge,
    staleIfError,
    staleWhileRevalidate,
    allowStatus,
  });

  if (ok && setCacheControlHeader) {
    const control: string[] = [];

    if (maxAge !== undefined) {
      control.push(`max-age=${maxAge}`);
    }

    if (sMaxAge !== undefined) {
      control.push(`s-maxage=${sMaxAge}`);
    }

    if (staleIfError !== undefined) {
      control.push(`stale-if-error=${staleIfError}`);
    }

    if (staleWhileRevalidate !== undefined) {
      control.push(`stale-while-revalidate=${staleWhileRevalidate}`);
    }

    cacheControl(res.headers, control.join(', '));
  }

  return res;
}

export default function cache(options: CacheOptions) {
  const { get } = options;
  const { set } = options;

  if (!get) throw new Error('.get not defined');
  if (!set) throw new Error('.set not defined');

  const defaultOptions = {
    backgroundRefresh: true,
    key: (req: Request) => req.url,
    maxAge: 0,
    staleWhileRevalidate: 0,
    staleIfError: 0,
    allowMethods: DEFAULT_ALLOW_METHODS,
    allowStatus: DEFAULT_ALLOW_STATUS,
    setCacheControlHeader: false,
    setCachedResponseHeader: false,
    strategies: () => DEFAULT_STRATEGIES,
    ...options,
  };

  return defineMiddlewareHandler(async function cacheMiddleware(ctx, next) {
    if (!ctx.module || !ctx.module?.config?.cache) {
      return next();
    }

    const rawConfig = ctx.module.config.cache;
    const routeConfig: Partial<CacheOptions> =
      rawConfig === true ? {} : rawConfig;
    const resolveOptions = {
      sMaxAge: routeConfig.maxAge ?? defaultOptions.maxAge,
      ...defaultOptions,
      ...routeConfig,
    };

    if (!resolveOptions.allowMethods.includes(ctx.request.method)) {
      return next();
    }

    const key = resolveOptions.key(ctx.request);
    const strategiesName = resolveOptions.strategies(ctx.request);

    switch (strategiesName) {
      case STALE_WHILE_REVALIDATE: {
        const cache = await getCache(key, resolveOptions);

        if (cache) {
          if (await isStale(key, { get })) {
            if (resolveOptions.backgroundRefresh) {
              // Update cache in the background
              // TODO: Use waitUntil
              callNextAndSetCache(key, next, resolveOptions).catch(() => {});
            } else {
              await callNextAndSetCache(key, next, resolveOptions);
            }
          }

          return cache;
        }

        return callNextAndSetCache(key, next, resolveOptions);
      }

      case NETWORK_ONLY: {
        // TODO: networkTimeout
        return next();
      }

      case CACHE_ONLY: {
        const cache = await getCache(key, resolveOptions);

        if (!cache) {
          throw new Error('No response.');
        }

        return cache;
      }

      case CACHE_FIRST: {
        const cache = await getCache(key, resolveOptions);

        if (cache) {
          return cache;
        }

        return callNextAndSetCache(key, next, resolveOptions);
      }

      case NETWORK_FIRST: {
        try {
          // TODO: networkTimeout
          return await callNextAndSetCache(key, next, resolveOptions);
        } catch (error) {
          const cache = await getCache(key, resolveOptions);

          if (cache) {
            return cache;
          } else {
            throw error;
          }
        }
      }

      default: {
        throw new Error(`Not implemented: ${strategiesName}`);
      }
    }
  });
}
