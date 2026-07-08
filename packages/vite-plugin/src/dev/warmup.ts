import type { ViteDevServer } from 'vite';
import type { ResolvedWebRouterConfig } from '@/types';
import { getServerEnvironmentFromDevServer } from '@/internal/environment';

export async function warmupServerDevModules(
  viteServer: ViteDevServer,
  config: ResolvedWebRouterConfig
) {
  const serverEnvironment = getServerEnvironmentFromDevServer(viteServer);
  const files = [config.input.server.entry, config.input.server.routemap];

  for (const file of files) {
    if (
      'warmupRequest' in serverEnvironment &&
      typeof serverEnvironment.warmupRequest === 'function'
    ) {
      await serverEnvironment.warmupRequest(file);
    }
  }
}
