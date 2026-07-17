import { context } from '@web-widget/context/server';
import type { State } from '@web-widget/schema';
import { escapeHtml, escapeJson } from '@web-widget/purify';
import { LIFECYCLE_CACHE_LAYER, EXPOSE } from './constants';

export { lifecycleCache } from './cache';
export * from './provider';

declare module '@web-widget/schema' {
  interface State {
    [EXPOSE]?: Set<string>;
    toJSON?: (this: any) => Record<string, any>;
  }
}

/**
 * Serialize the cache and transfer it to the client.
 */
export interface RenderLifecycleCacheLayerOptions {
  scriptAttributes?: Record<string, string>;
}

function renderAttributes(attributes: Record<string, string> = {}) {
  return Object.entries(attributes)
    .map(([name, value]) => {
      if (!/^[^\s"'<>/=]+$/.test(name)) {
        throw new TypeError(`Invalid script attribute name: ${name}`);
      }
      return ` ${name}="${escapeHtml(value)}"`;
    })
    .join('');
}

export function renderLifecycleCacheLayer(
  state?: State,
  options: RenderLifecycleCacheLayerOptions = {}
) {
  const cache = state ?? context().state;
  cache.toJSON ??= toJSON;

  let result = '';
  const json = JSON.stringify(cache);

  if (json !== '{}') {
    result += `<script${renderAttributes(options.scriptAttributes)}>`;
    result += `(self.${LIFECYCLE_CACHE_LAYER}=self.${LIFECYCLE_CACHE_LAYER}||[]).push`;
    result += `(${escapeJson(json)})`;
    result += `</script>`;
  }

  return result;
}

function toJSON(this: State): any {
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
