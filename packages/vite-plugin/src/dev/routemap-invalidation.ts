import type { ViteDevServer } from 'vite';
import { shouldClientFullReload } from './routing/routemap-update';
import { sendClientFullReload } from './server-full-reload-plugin';
import { invalidateServerDevModules } from './server-invalidation';
import { getServerEnvironmentFromDevServer } from '@/internal/environment';
import type { ResolvedWebRouterConfig } from '@/types';

export async function handleDevRoutemapChange(
  viteServer: ViteDevServer,
  config: ResolvedWebRouterConfig,
  options: {
    structural: boolean;
    filesystemChanged: boolean;
  }
): Promise<void> {
  invalidateServerDevModules(
    getServerEnvironmentFromDevServer(viteServer).moduleGraph,
    config
  );

  if (shouldClientFullReload(options.structural, options.filesystemChanged)) {
    sendClientFullReload(viteServer);
  }
}
