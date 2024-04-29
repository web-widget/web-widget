import { lifecycleCache } from './cache';

const ERROR = Symbol.for('error');
type PromiseState<T> = Promise<T> & {
  [ERROR]: T | Error;
};

export async function cacheAsyncProvider<T>(
  cacheKey: string,
  handler: () => T | Promise<T>,
  exposedToClient: boolean = true
): Promise<T> {
  const cache = lifecycleCache<{
    [cacheKey: string]: T | Promise<T>;
  }>();
  let cacheValue = cache.get(cacheKey);

  if (cacheValue) {
    return cacheValue;
  }

  cacheValue = handler();
  cache.set(cacheKey, cacheValue, exposedToClient);

  if (cacheValue instanceof Promise) {
    return cacheValue.then((result) => {
      cache.set(cacheKey, result, exposedToClient);
      return result;
    });
  }

  return cacheValue;
}

export function cacheSyncProvider<T>(
  cacheKey: string,
  handler: () => T | Promise<T>,
  exposedToClient: boolean = true
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
  cache.set(cacheKey, cacheValue, exposedToClient);

  if (cacheValue instanceof Promise) {
    throw cacheValue.then(
      (result) => {
        cache.set(cacheKey, result, exposedToClient);
      },
      (error) => {
        (cacheValue as PromiseState<T>)[ERROR] = error;
      }
    );
  }

  return cacheValue;
}
