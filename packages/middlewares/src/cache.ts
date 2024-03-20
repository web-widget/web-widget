// Based on the code in the MIT licensed `koa-cash` package.
import type { MiddlewareNext } from '@web-widget/helpers';
import { defineMiddlewareHandler } from '@web-widget/helpers';
import { Status, STATUS_TEXT } from '@web-widget/helpers/status';

declare module '@web-widget/schema' {
  interface RouteConfig {
    cache?: Partial<CacheOptions> | boolean;
  }
}

export interface CacheOptions {
  /** The maximum age of the cache in milliseconds. This value is 0 by default. */
  maxAge?: number;

  /**
   * If a truthy value is passed, then X-Cached-Response header will be set as HIT when response is served from the cache.
   * This value is false by default.
   */
  setCachedHeader?: boolean;

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
  | 'uncached-first'
  | 'uncached-only'
  | 'cache-only';

export const STALE_WHILE_REVALIDATE: Strategies = 'stale-while-revalidate';
export const CACHE_FIRST: Strategies = 'cache-first';
export const UNCACHED_FIRST: Strategies = 'uncached-first';
export const UNCACHED_ONLY: Strategies = 'uncached-only';
export const CACHE_ONLY: Strategies = 'cache-only';

const DEFAULT_STRATEGIES: Strategies = STALE_WHILE_REVALIDATE;
const EXPIRE_KEY = ':expire';
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

export async function isExpireCache(
  key: string,
  { get }: Required<Pick<CacheOptions, 'get'>>
) {
  const expire: number = (await get(key + EXPIRE_KEY)) ?? 0;

  if (!expire) {
    return true;
  }

  return expire < new Date().getTime();
}

async function getCache(
  key: string,
  {
    get,
    setCachedHeader,
  }: Required<Pick<CacheOptions, 'get' | 'setCachedHeader'>>
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

  const cachedResponse = new Response(cacheValue.body, {
    status: Status.OK,
    statusText: STATUS_TEXT[Status.OK],
    headers: cachedHeaders,
  });

  return cachedResponse;
}

async function setCache(
  key: string,
  res: Response,
  { maxAge, set }: Required<Pick<CacheOptions, 'maxAge' | 'set'>>
) {
  // only cache GET/HEAD 200s
  if (res.status !== Status.OK) {
    return;
  }
  const cacheValue: CacheValue = {
    body: await res.clone().text(),
    contentType: res.headers.get('Content-Type'),
    lastModified: res.headers.get('Last-Modified'),
    etag: res.headers.get('ETag'),
  };

  await set(key, cacheValue);
  await set(key + EXPIRE_KEY, new Date().getTime() + maxAge, maxAge);
}

async function callNextAndSetCache(
  key: string,
  next: MiddlewareNext,
  { maxAge, set }: Required<Pick<CacheOptions, 'maxAge' | 'set'>>
) {
  const res = await next();

  await setCache(key, res, {
    maxAge,
    set,
  });

  return res;
}

export default function cache(options: CacheOptions) {
  const { get } = options;
  const { set } = options;

  if (!get) throw new Error('.get not defined');
  if (!set) throw new Error('.set not defined');

  return defineMiddlewareHandler(async function cacheMiddleware(ctx, next) {
    if (!ctx.module || !ctx.module?.config?.cache) {
      return next();
    }

    const rawConfig = ctx.module.config.cache;
    const userConfig: Partial<CacheOptions> = !rawConfig
      ? {
          strategies: () => UNCACHED_ONLY,
        }
      : rawConfig === true
        ? {}
        : rawConfig;
    const methods = options.methods ?? DEFAULT_METHODS;
    const maxAge = userConfig.maxAge ?? 0;
    const get = userConfig.get ?? options.get;
    const set = userConfig.set ?? options.set;
    const setCachedHeader =
      userConfig.setCachedHeader ?? options.setCachedHeader ?? false;
    const hash = userConfig.hash ?? ((req: Request) => req.url);
    const strategies = !methods[ctx.request.method]
      ? UNCACHED_ONLY
      : typeof userConfig.strategies === 'function'
        ? userConfig.strategies(ctx.request)
        : DEFAULT_STRATEGIES;

    switch (strategies) {
      case UNCACHED_ONLY: {
        return next();
      }

      case CACHE_ONLY: {
        const cache = await getCache(hash(ctx.request), {
          get,
          setCachedHeader,
        });

        if (!cache) {
          throw new Error('No response.');
        }

        return cache;
      }

      case CACHE_FIRST: {
        const cache = await getCache(hash(ctx.request), {
          get,
          setCachedHeader,
        });

        if (cache) {
          return cache;
        }

        return next();
      }

      case UNCACHED_FIRST: {
        try {
          // TODO: Timeout
          return next();
        } catch (error) {
          const cache = await getCache(hash(ctx.request), {
            get,
            setCachedHeader,
          });

          if (cache) {
            return cache;
          } else {
            throw error;
          }
        }
      }

      case STALE_WHILE_REVALIDATE: {
        const key = hash(ctx.request);
        const cache = await getCache(key, {
          get,
          setCachedHeader,
        });

        if (cache) {
          if (await isExpireCache(key, { get })) {
            // Update cache in the background
            // TODO: Use waitUntil
            callNextAndSetCache(hash(ctx.request), next, {
              maxAge,
              set,
            }).catch(() => {});
          }

          return cache;
        }

        return callNextAndSetCache(hash(ctx.request), next, {
          maxAge,
          set,
        });
      }

      default: {
        throw new Error(`Not implemented: ${strategies}`);
      }
    }
  });
}
