import type { Plugin, ViteDevServer } from 'vite';
import {
  applyToServerEnvironment,
  getServerEnvironmentFromDevServer,
} from '@/internal/environment';
import type { RouterPluginHost } from '@/router/host';
import { invalidateServerDevModules } from './server-invalidation';

export function sendClientFullReload(server: ViteDevServer) {
  server.environments.client.hot.send({
    type: 'full-reload',
  });
}

/**
 * When server modules change, notify the browser to reload so server-rendered HTML
 * updates without a manual refresh. Uses Vite 8 per-environment `hotUpdate`.
 */
export function createServerFullReloadPlugin(host: RouterPluginHost): Plugin {
  return {
    name: '@web-widget:server-full-reload',
    apply: 'serve',
    applyToEnvironment: applyToServerEnvironment(),

    hotUpdate({ server, modules }) {
      if (modules.length === 0) {
        return;
      }

      void invalidateServerDevModules(
        getServerEnvironmentFromDevServer(server).moduleGraph,
        host.state.resolvedWebRouterConfig
      ).catch((error) => {
        const prefix = '🚧 @web-widget/vite-plugin server invalidation failed:';
        if (error instanceof Error) {
          console.error(`${prefix} ${error.stack}`);
        } else {
          console.error(prefix, error);
        }
      });
      return [];
    },
  };
}
