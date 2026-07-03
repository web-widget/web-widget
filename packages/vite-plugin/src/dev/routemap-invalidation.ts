import type { ViteDevServer } from 'vite';
import type { ResolvedWebRouterConfig } from '@/types';
import { shouldClientFullReload } from './routing/routemap-update';
import { sendClientFullReload } from './server-full-reload-plugin';
import { getServerEnvironmentFromDevServer } from '@/internal/environment';
import { invalidateServerDevModules } from './server-invalidation';

export async function handleDevRoutemapChange(
  viteServer: ViteDevServer,
  config: ResolvedWebRouterConfig,
  options: {
    structural: boolean;
    filesystemChanged: boolean;
  }
): Promise<void> {
  await invalidateServerDevModules(
    getServerEnvironmentFromDevServer(viteServer).moduleGraph,
    config
  );

  if (shouldClientFullReload(options.structural, options.filesystemChanged)) {
    sendClientFullReload(viteServer);
  }
}
