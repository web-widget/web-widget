import type { SerializableValue } from '@web-widget/schema';
import type { LifecycleCache } from './cache';
import { lifecycleCache } from './cache';

const CACHE_VALUE_ERROR_MESSAGE =
  'The cached value cannot be null or undefined.';

export type CacheProviderOptions = {
  cache?: LifecycleCache<any>;
  serverOnly?: boolean;
};

function composeCacheKey(cacheKey: string, args?: any[]): string {
  cacheKey = `^${cacheKey}`;
  return args?.length ? `${cacheKey}#${JSON.stringify(args)}` : cacheKey;
}

/**
 * Provide end-to-end cached values, the results are asynchronous.
 * @param cacheKey Cache key
 * @param handler Handler function
 * @param args Handler arguments
 * @returns Cached value
 */
export async function cacheProvider<
  R extends NonNullable<SerializableValue>,
  A extends any[],
>(
  cacheKey: string,
  handler: (...args: A) => R | Promise<R>,
  args: A = [] as unknown as A,
  options: CacheProviderOptions = {}
): Promise<R> {
  if (typeof handler !== 'function') {
    throw new TypeError('Handler is required.');
  }

  const id = composeCacheKey(cacheKey, args);
  const expose = !options.serverOnly;
  const cache =
    options.cache ??
    lifecycleCache<{
      [cacheKey: string]: R | Promise<R>;
    }>();
  let value = cache.get(id);

  if (value != null) {
    return value;
  }

  value = handler(...args);

  if (value == null) {
    throw new Error(CACHE_VALUE_ERROR_MESSAGE);
  }

  cache.set(id, value as R, expose);

  if (value instanceof Promise) {
    return value.then((value) => {
      if (value == null) {
        throw new Error(CACHE_VALUE_ERROR_MESSAGE);
      }
      cache.set(id, value, expose);
      return value;
    });
  }

  return value;
}

export const asyncCacheProvider = cacheProvider;

const ERROR = Symbol.for('error');
type PromiseState<T> = Promise<T> & {
  [ERROR]: T | Error;
};

/**
 * Provide end-to-end cached values, the results are synchronized.
 * @param cacheKey Cache key
 * @param handler Handler function
 * @param args Handler arguments
 * @returns Cached value
 */
export function syncCacheProvider<
  R extends NonNullable<SerializableValue>,
  A extends any[],
>(
  cacheKey: string,
  handler: (...args: A) => R | Promise<R>,
  args: A = [] as unknown as A,
  options: CacheProviderOptions = {}
): R {
  if (typeof handler !== 'function') {
    throw new TypeError('Handler is required.');
  }

  const id = composeCacheKey(cacheKey, args);
  const expose = !options.serverOnly;
  const cache =
    options.cache ??
    lifecycleCache<{
      [cacheKey: string]: R | Promise<R>;
    }>();
  let value = cache.get(id);

  if (value != null) {
    if (value instanceof Promise) {
      throw (value as PromiseState<R>)[ERROR] ?? value;
    }
    return value;
  }

  value = handler(...args);

  if (value == null) {
    throw new Error(CACHE_VALUE_ERROR_MESSAGE);
  }

  cache.set(id, value as R, expose);

  if (value instanceof Promise) {
    throw value.then(
      (value) => {
        if (value == null) {
          throw new Error(CACHE_VALUE_ERROR_MESSAGE);
        }
        cache.set(id, value, expose);
        return value;
      },
      (error) => {
        (value as PromiseState<R>)[ERROR] = error;
        throw error;
      }
    );
  }

  return value;
}

export function cacheProviderIsLoading(value: unknown) {
  return value instanceof Promise;
}

export async function callSyncCacheProvider<T>(handler: () => T) {
  try {
    return await handler();
  } catch (error) {
    if (cacheProviderIsLoading(error)) {
      await error;
      return callSyncCacheProvider(handler);
    } else {
      throw error;
    }
  }
}
