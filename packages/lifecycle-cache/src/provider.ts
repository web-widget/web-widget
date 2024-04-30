import { lifecycleCache } from './cache';

const ERROR = Symbol.for('error');
type PromiseState<T> = Promise<T> & {
  [ERROR]: T | Error;
};

/**
 * Provide end-to-end cached values, the results are asynchronous.
 * @param cacheKey Cache key
 * @param handler Handler function
 * @returns Cached value
 */
export async function asyncCacheProvider<T>(
  cacheKey: string,
  handler: () => T | Promise<T>
): Promise<T> {
  const cache = lifecycleCache<{
    [cacheKey: string]: T | Promise<T>;
  }>();
  let cacheValue = cache.get(cacheKey);

  if (cacheValue) {
    return cacheValue;
  }

  cacheValue = handler();
  cache.set(cacheKey, cacheValue, false);

  if (cacheValue instanceof Promise) {
    return cacheValue.then((result) => {
      cache.set(cacheKey, result, false);
      return result;
    });
  }

  return cacheValue;
}

/**
 * Provide end-to-end cached values, the results are synchronized.
 * @param cacheKey Cache key
 * @param handler Handler function
 * @returns Cached value
 */
export function syncCacheProvider<T>(
  cacheKey: string,
  handler: () => T | Promise<T>
): T {
  const cache = lifecycleCache<{
    [cacheKey: string]: T | Promise<T>;
  }>();
  let cacheValue = cache.get(cacheKey);

  if (cacheValue) {
    if (cacheValue instanceof Promise) {
      throw (cacheValue as PromiseState<T>)[ERROR] ?? cacheValue;
    }
    return cacheValue;
  }

  cacheValue = handler();
  cache.set(cacheKey, cacheValue, false);

  if (cacheValue instanceof Promise) {
    throw cacheValue.then(
      (result) => {
        cache.set(cacheKey, result, false);
      },
      (error) => {
        (cacheValue as PromiseState<T>)[ERROR] = error;
      }
    );
  }

  return cacheValue;
}
