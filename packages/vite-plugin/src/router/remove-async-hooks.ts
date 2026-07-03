import type { Plugin } from 'vite';
import type { RouterPluginHost } from './host';

export function createRemoveAsyncHooksPlugin(host: RouterPluginHost): Plugin {
  return {
    name: '@web-widget:remove-async-hooks',
    enforce: 'pre',
    sharedDuringBuild: true,

    async resolveId(id) {
      const { resolvedWebRouterConfig } = host.state;
      if (id === 'node:async_hooks') {
        return resolvedWebRouterConfig.asyncContext.enabled ? false : id;
      }
      return null;
    },

    async load(id) {
      const { resolvedWebRouterConfig } = host.state;
      if (id === 'node:async_hooks') {
        return resolvedWebRouterConfig.asyncContext.enabled
          ? null
          : 'export const AsyncLocalStorage = undefined';
      }
      return null;
    },
  };
}
