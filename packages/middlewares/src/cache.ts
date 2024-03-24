// Based on the code in the MIT licensed `koa-cash` package.
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
  /** The maximum age of the cache in milliseconds. This value is 0 by default. */
  maxAge?: number;

  /**
   * The time in milliseconds to refresh the cache.
   * This value should not be greater than `maxAge`.
   * If a truthy value is passed, then the cache will be refreshed after the specified time.
   */
  refresh?: number;

  /**
   * If a truthy value is passed, then the cache will be refreshed in the background.
   * This value defaults to true.
   */
  backgroundRefresh?: boolean;

  /**
   * If a truthy value is passed, the "X-Cached-Response" and "Age" headers are set.
   * This value defaults to false.
   */
  setCachedHeader?: boolean;

  /**
   * If a truthy value is passed, then the "Cache-Control" header is set.
   * This value defaults to false.
   */
  setCacheControlHeader?: boolean;

  /**
   * If an object is passed, then add extra HTTP method caching. This value is empty by default.
   * But GET and HEAD are enabled.
   * Eg: `{ POST: true }`
   */
  methods?: Record<string, boolean>;

  /**
   * A hashing function. By default, it's:
   * (req) => req.url
   */
  hash?: (req: Request) => string;

  /**
   * Strategies to use for caching. By default, it's:
   * (req) => 'stale-while-revalidate'
   */
  strategies?: (req: Request) => Strategies;

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
const REFRESH_KEY = ':refresh';
const CREATION_KEY = ':creation';
const DEFAULT_METHODS: Record<string, boolean> = {
  HEAD: true,
  GET: true,
};

export type CacheValue = {
  body: string | null;
  contentType: string | null;
  lastModified: string | null;
  etag: string | null;
};

export async function isRefreshable(
  key: string,
  { get }: Required<Pick<CacheOptions, 'get'>>
) {
  const expire: number = await get(key + REFRESH_KEY);

  if (typeof expire === 'number') {
    return expire < Date.now();
  } else {
    return true;
  }
}

export async function getCache(
  key: string,
  {
    get,
    setCacheControlHeader,
    setCachedHeader,
  }: Required<
    Pick<CacheOptions, 'get' | 'setCacheControlHeader' | 'setCachedHeader'>
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

  if (setCachedHeader) {
    cachedHeaders.set('X-Cached-Response', 'HIT');
  }

  if (setCacheControlHeader) {
    const creationTime = await get(key + CREATION_KEY);
    const now = Date.now();
    const age = Math.round((now - creationTime) / 1000);
    cachedHeaders.set('Age', String(age));

    const expiryTime = await get(key + REFRESH_KEY);
    if (expiryTime) {
      const maxAge = Math.round((expiryTime - now) / 1000);
      cacheControl(cachedHeaders, `max-age=${maxAge}`);
    }
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
    refresh,
    set,
    setCacheControlHeader,
  }: Required<
    Pick<CacheOptions, 'maxAge' | 'refresh' | 'set' | 'setCacheControlHeader'>
  >
) {
  // only cache GET/HEAD 200s
  if (res.status !== Status.OK) {
    return false;
  }
  const cacheValue: CacheValue = {
    body: await res.clone().text(),
    contentType: res.headers.get('Content-Type'),
    lastModified: res.headers.get('Last-Modified'),
    etag: res.headers.get('ETag'),
  };

  await set(key, cacheValue, maxAge);
  const now = Date.now();

  if (refresh) {
    await set(key + REFRESH_KEY, now + refresh, refresh);
  }

  if (setCacheControlHeader) {
    await set(key + CREATION_KEY, now, maxAge);
  }

  return true;
}

async function callNextAndSetCache(
  key: string,
  next: MiddlewareNext,
  {
    maxAge,
    refresh,
    set,
    setCacheControlHeader,
  }: Required<
    Pick<CacheOptions, 'maxAge' | 'refresh' | 'set' | 'setCacheControlHeader'>
  >
) {
  const res = await next();

  const ok = await setCache(key, res, {
    maxAge,
    refresh,
    set,
    setCacheControlHeader,
  });

  if (ok && setCacheControlHeader && (refresh || maxAge)) {
    cacheControl(
      res.headers,
      `max-age=${Math.round((refresh || maxAge) / 1000)}`
    );
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
    hash: (req: Request) => req.url,
    maxAge: 0,
    methods: DEFAULT_METHODS,
    setCacheControlHeader: false,
    setCachedHeader: false,
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
      refresh: routeConfig.maxAge ?? defaultOptions.maxAge,
      ...defaultOptions,
      ...routeConfig,
    };

    if (!resolveOptions.methods[ctx.request.method]) {
      return next();
    }

    const key = resolveOptions.hash(ctx.request);
    const strategiesName = resolveOptions.strategies(ctx.request);

    switch (strategiesName) {
      case STALE_WHILE_REVALIDATE: {
        const cache = await getCache(key, resolveOptions);

        if (cache) {
          if (await isRefreshable(key, { get })) {
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
