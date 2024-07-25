import type { SerializableValue } from '@web-widget/schema';
import { lifecycleCache } from './cache';

const ERROR = Symbol.for('error');
type PromiseState<T> = Promise<T> & {
  [ERROR]: T | Error;
};

function throwIfNullOrUndefined<T>(
  value: T | null | undefined
): asserts value is T {
  if (value == null) {
    throw new Error('The cached value cannot be null or undefined.');
  }
}

/**
 * Provide end-to-end cached values, the results are asynchronous.
 * @param cacheKey Cache key
 * @param handler Handler function
 * @param args Handler arguments
 * @returns Cached value
 */
export async function cacheProvider<
  A extends SerializableValue,
  R extends NonNullable<SerializableValue>,
>(
  cacheKey: string,
  handler: (...arts: A[]) => R | Promise<R>,
  args?: A[]
): Promise<R> {
  const cache = lifecycleCache<{
    [cacheKey: string]: R | Promise<R>;
  }>();
  let cachedValue = cache.get(cacheKey);

  if (cachedValue != null) {
    return cachedValue;
  }

  cachedValue = args ? handler(...args) : handler();
  cache.set(cacheKey, cachedValue as R, true);

  if (cachedValue instanceof Promise) {
    return cachedValue.then((result) => {
      throwIfNullOrUndefined(result);
      cache.set(cacheKey, result, true);
      return result;
    });
  } else {
    throwIfNullOrUndefined(cachedValue);
  }

  return cachedValue;
}

export const asyncCacheProvider = cacheProvider;

/**
 * Provide end-to-end cached values, the results are synchronized.
 * @param cacheKey Cache key
 * @param handler Handler function
 * @param args Handler arguments
 * @returns Cached value
 */
export function syncCacheProvider<
  A extends SerializableValue,
  R extends NonNullable<SerializableValue>,
>(cacheKey: string, handler: (...args: A[]) => R | Promise<R>, args?: A[]): R {
  const cache = lifecycleCache<{
    [cacheKey: string]: R | Promise<R>;
  }>();
  let cachedValue = cache.get(cacheKey);

  if (cachedValue != null) {
    if (cachedValue instanceof Promise) {
      throw (cachedValue as PromiseState<R>)[ERROR] ?? cachedValue;
    }
    return cachedValue;
  }

  cachedValue = args ? handler(...args) : handler();
  cache.set(cacheKey, cachedValue as R, true);

  if (cachedValue instanceof Promise) {
    throw cachedValue.then(
      (result) => {
        throwIfNullOrUndefined(result);
        cache.set(cacheKey, result, true);
      },
      (error) => {
        (cachedValue as PromiseState<R>)[ERROR] = error;
      }
    );
  } else {
    throwIfNullOrUndefined(cachedValue);
  }

  return cachedValue;
}
