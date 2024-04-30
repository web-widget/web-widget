import { context } from '@web-widget/context';
import type { RouteState } from '@web-widget/schema';
import { allowExposedToClient } from './utils';

/**
 * LifecycleCache is a key/value map that allows you to store data for the duration of a request.
 */
export class LifecycleCache<V extends Record<string, unknown>> {
  #storage: V;
  [Symbol.toStringTag] = 'LifecycleCache';

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
  set<K extends keyof V>(key: K, value: V[K], expose: boolean = false) {
    if (expose) {
      allowExposedToClient(this.#storage, key as string);
    }
    this.#storage[key] = value;
    return this;
  }
}

export function lifecycleCache<T extends RouteState>(state?: T) {
  return new LifecycleCache<T & RouteState>((state ?? context().state) as T);
}
