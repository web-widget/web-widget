import { context } from '@web-widget/context/server';
import type { RouteState } from '@web-widget/schema';
import { htmlEscapeJsonString } from './utils';
import { LIFECYCLE_CACHE_LAYER, EXPOSE } from './constants';

export { lifecycleCache } from './cache';
export * from './provider';

declare module '@web-widget/schema' {
  interface RouteState {
    [EXPOSE]?: Set<string>;
    toJSON?: (this: any) => Record<string, any>;
  }
}

/**
 * Serialize the cache and transfer it to the client.
 */
export function renderLifecycleCacheLayer(state?: RouteState) {
  const cache = state ?? context().state;
  cache.toJSON ??= toJSON;

  let result = '';
  const json = JSON.stringify(cache);

  if (json !== '{}') {
    result += `<script>`;
    result += `(self.${LIFECYCLE_CACHE_LAYER}=self.${LIFECYCLE_CACHE_LAYER}||[]).push`;
    result += `(${htmlEscapeJsonString(json)})`;
    result += `</script>`;
  }

  return result;
}

function toJSON(this: RouteState): any {
  const expose = this[EXPOSE];
  if (expose) {
    const newObject = {};
    for (const key of expose) {
      if (!(this[key] instanceof Promise)) {
        expose.delete(key);
        (newObject as any)[key] = this[key];
      }
    }
    return newObject;
  }
  return {};
}
