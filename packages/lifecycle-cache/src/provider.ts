import { lifecycleCache } from './cache';

const ERROR = Symbol.for('error');
type PromiseState<T> = Promise<T> & {
  [ERROR]: T | Error;
};

type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

/**
 * Provide end-to-end cached values, the results are asynchronous.
 * @param cacheKey Cache key
 * @param handler Handler function
 * @returns Cached value
 */
export async function asyncCacheProvider<T extends JSONValue>(
  cacheKey: string,
  handler: () => T | Promise<T>
): Promise<T> {
  const cache = lifecycleCache<{
    [cacheKey: string]: T | Promise<T>;
  }>();
  let cachedValue = cache.get(cacheKey);

  if (cachedValue) {
    return cachedValue;
  }

  cachedValue = handler();
  cache.set(cacheKey, cachedValue, false);

  if (cachedValue instanceof Promise) {
    return cachedValue.then((result) => {
      cache.set(cacheKey, result, false);
      return result;
    });
  }

  return cachedValue;
}

/**
 * Provide end-to-end cached values, the results are synchronized.
 * @param cacheKey Cache key
 * @param handler Handler function
 * @returns Cached value
 */
export function syncCacheProvider<T extends JSONValue>(
  cacheKey: string,
  handler: () => T | Promise<T>
): T {
  const cache = lifecycleCache<{
    [cacheKey: string]: T | Promise<T>;
  }>();
  let cachedValue = cache.get(cacheKey);

  if (cachedValue) {
    if (cachedValue instanceof Promise) {
      throw (cachedValue as PromiseState<T>)[ERROR] ?? cachedValue;
    }
    return cachedValue;
  }

  cachedValue = handler();
  cache.set(cacheKey, cachedValue, false);

  if (cachedValue instanceof Promise) {
    throw cachedValue.then(
      (result) => {
        cache.set(cacheKey, result, false);
      },
      (error) => {
        (cachedValue as PromiseState<T>)[ERROR] = error;
      }
    );
  }

  return cachedValue;
}
