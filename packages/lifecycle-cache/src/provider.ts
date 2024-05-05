import type { SerializableValue } from '@web-widget/schema';
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
export async function asyncCacheProvider<T extends SerializableValue>(
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
  cache.set(cacheKey, cachedValue as T, true);

  if (cachedValue instanceof Promise) {
    return cachedValue.then((result) => {
      cache.set(cacheKey, result, true);
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
export function syncCacheProvider<T extends SerializableValue>(
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
  cache.set(cacheKey, cachedValue as T, true);

  if (cachedValue instanceof Promise) {
    throw cachedValue.then(
      (result) => {
        cache.set(cacheKey, result, true);
      },
      (error) => {
        (cachedValue as PromiseState<T>)[ERROR] = error;
      }
    );
  }

  return cachedValue;
}

export function cacheProvider<T extends SerializableValue>(
  cacheKey: string,
  handler: () => Promise<T>,
  options: {
    sync: true;
  }
): T;

export function cacheProvider<T extends SerializableValue>(
  cacheKey: string,
  handler: () => Promise<T>,
  options: {
    sync: false;
  }
): Promise<T>;

export function cacheProvider<T extends SerializableValue>(
  cacheKey: string,
  handler: () => T | Promise<T>,
  options?: {
    sync?: boolean;
  }
) {
  return options?.sync
    ? syncCacheProvider<T>(cacheKey, handler as () => T)
    : asyncCacheProvider<T>(cacheKey, handler as () => Promise<T>);
}
