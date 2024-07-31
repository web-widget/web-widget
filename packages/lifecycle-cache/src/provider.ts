import type { SerializableValue } from '@web-widget/schema';
import type { LifecycleCache } from './cache';
import { lifecycleCache } from './cache';

const CACHE_VALUE_ERROR_MESSAGE =
  'The cached value cannot be null or undefined.';

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
  cache: LifecycleCache<any> = lifecycleCache<{
    [cacheKey: string]: R | Promise<R>;
  }>()
): Promise<R> {
  if (typeof handler !== 'function') {
    throw new TypeError('Handler is required.');
  }

  let value = cache.get(cacheKey);

  if (value != null) {
    return value;
  }

  value = handler(...args);

  if (value == null) {
    throw new Error(CACHE_VALUE_ERROR_MESSAGE);
  }

  cache.set(cacheKey, value as R, true);

  if (value instanceof Promise) {
    return value.then((value) => {
      if (value == null) {
        throw new Error(CACHE_VALUE_ERROR_MESSAGE);
      }
      cache.set(cacheKey, value, true);
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
  cache: LifecycleCache<any> = lifecycleCache<{
    [cacheKey: string]: R | Promise<R>;
  }>()
): R {
  if (typeof handler !== 'function') {
    throw new TypeError('Handler is required.');
  }

  let value = cache.get(cacheKey);

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

  cache.set(cacheKey, value as R, true);

  if (value instanceof Promise) {
    throw value.then(
      (value) => {
        if (value == null) {
          throw new Error(CACHE_VALUE_ERROR_MESSAGE);
        }
        cache.set(cacheKey, value, true);
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
