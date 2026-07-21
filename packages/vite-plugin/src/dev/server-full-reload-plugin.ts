import type { Plugin, ViteDevServer } from 'vite';
import { invalidateServerDevModules } from './server-invalidation';
import { shouldReloadClientForServerUpdate } from './server-full-reload-policy';
import {
  applyToServerEnvironment,
  getServerEnvironmentFromDevServer,
} from '@/internal/environment';
import type { RouterPluginHost } from '@/router/host';
import { logPlugin } from '@/internal/log';

export function sendClientFullReload(
  server: ViteDevServer,
  files?: string[]
): void {
  const detail =
    files && files.length > 0
      ? ' ' +
        files.map((f) => f.replace(server.config.root + '/', '')).join(', ')
      : '';
  getServerEnvironmentFromDevServer(server).logger.info(
    'page reload' + detail,
    {
      timestamp: true,
    }
  );
  server.environments.client.hot.send({ type: 'full-reload' });
}

/**
 * When server modules change, notify the browser to reload so server-rendered HTML
 * updates without a manual refresh. Uses Vite 8 per-environment `hotUpdate`.
 *
 * Server-only modules (e.g. route files) have no counterpart in the client module
 * graph, so client-side HMR cannot update them. For those, a full reload is
 * required. Modules that also exist in the client environment (e.g. widgets) are
 * left to the client's own HMR.
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

      let serverInvalidationFailed = false;
      try {
        // Invalidate the complete server importer chain before allowing client
        // HMR. CSS Modules export class maps during SSR, so stale renderers can
        // otherwise disagree with a client that already received the update.
        invalidateServerDevModules(
          getServerEnvironmentFromDevServer(server).moduleGraph,
          host.state.resolvedWebRouterConfig,
          modules.map((mod) => mod.file).filter(Boolean) as string[]
        );
      } catch (error) {
        serverInvalidationFailed = true;
        logPlugin('error', 'Server invalidation failed', error);
      }

      const clientModuleGraph = server.environments.client.moduleGraph;
      if (
        serverInvalidationFailed ||
        shouldReloadClientForServerUpdate(
          modules,
          clientModuleGraph,
          host.state.stableDevCssModuleNames
        )
      ) {
        sendClientFullReload(
          server,
          modules.map((m) => m.file).filter(Boolean) as string[]
        );
        return [];
      }

      // Stop SSR HMR propagation from reaching route modules without an HMR
      // boundary. The client environment handles shared modules (including
      // CSS Modules) while the invalidation above keeps future SSR fresh.
      return [];
    },
  };
}
