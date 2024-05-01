import { context } from '@web-widget/context';
import type { RouteState } from '@web-widget/schema';
import { allowExposedToClient } from './utils';
import type { JSONValue } from './types';

type LifecycleCacheValue<
  V,
  K extends keyof V,
  E extends boolean,
> = E extends true ? JSONValue & V[K] : V[K];

/**
 * LifecycleCache is a key/value map that allows you to store data for the duration of a request.
 */
export class LifecycleCache<V extends Record<string, unknown>> {
  #storage: V;

  constructor(storage: V) {
    this.#storage = storage;
  }

  /**
   * Removes the specified element from the LifecycleCache.
   * @returns true if the element was successfully removed, or false if it was not present.
   */
  delete<K extends keyof V>(key: K): boolean {
    return delete this.#storage[key];
  }

  /**
   * @returns a specified element.
   */
  get<K extends keyof V>(key: K): V[K] {
    return this.#storage[key];
  }

  /**
   * @returns a boolean indicating whether an element with the specified key exists or not.
   */
  has<K extends keyof V>(key: K): boolean {
    return key in this.#storage;
  }

  /**
   * Adds a new element with a specified key and value.
   * @param key Must be a string or number.
   * @param value The value to store.
   * @param expose Whether exposed to the client, the default is `false`.
   */
  set<K extends keyof V, E extends boolean = false>(
    key: K,
    value: LifecycleCacheValue<V, K, E>,
    expose: E = false as E
  ) {
    if (expose) {
      allowExposedToClient(this.#storage, key as string);
    }
    this.#storage[key] = value as V[K];
    return this;
  }
}

export function lifecycleCache<T extends RouteState>(state?: T) {
  return new LifecycleCache<T & RouteState>((state ?? context().state) as T);
}
