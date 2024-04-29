import {
  context,
  callContext,
  getSafeSerializableContext,
} from '@web-widget/context/client';
import { LIFECYCLE_CACHE_LAYER } from './constants';

export { lifecycleCache } from './cache';
export { cacheAsyncProvider, cacheSyncProvider } from './provider';

declare global {
  interface Window {
    [LIFECYCLE_CACHE_LAYER]: LifecycleCacheLayer;
  }
}

export type LifecycleCacheLayerHandler = (
  value: any,
  index: number,
  array: any[]
) => void;

export class LifecycleCacheLayer implements ArrayLike<any> {
  #handler: LifecycleCacheLayerHandler;
  constructor(handler: LifecycleCacheLayerHandler) {
    this.#handler = handler;
  }
  readonly [n: number]: any;

  length: number = 0;

  push(...list: any[]) {
    const length = Array.prototype.push.apply(this, list);
    list.forEach(this.#handler);
    return length;
  }
}

export function start(callback: () => void) {
  callContext(getSafeSerializableContext(), () => {
    const currentState = self[LIFECYCLE_CACHE_LAYER] as unknown as
      | undefined
      | any[];
    const { state } = context();
    self[LIFECYCLE_CACHE_LAYER] = new LifecycleCacheLayer((item) =>
      Object.assign(state, item)
    );

    if (currentState) {
      self[LIFECYCLE_CACHE_LAYER].push(...currentState);
    }

    callback();
  });
}
