import { bumpDevServerRevision } from './dev-server-cache';
import type { ResolvedWebRouterConfig } from '@/types';

/** Minimal server module graph surface for dev invalidation tests. */
export interface ServerDevModuleGraph {
  getModulesByFile(file: string): Set<unknown> | undefined;
  invalidateModule(
    mod: unknown,
    seen?: Set<unknown>,
    timestamp?: number,
    soft?: boolean
  ): void;
}

export async function invalidateServerDevModules(
  moduleGraph: ServerDevModuleGraph,
  config: ResolvedWebRouterConfig
): Promise<void> {
  const files = [config.input.server.entry, config.input.server.routemap];

  for (const file of files) {
    const modules = moduleGraph.getModulesByFile(file);
    if (!modules) {
      continue;
    }
    for (const mod of modules) {
      moduleGraph.invalidateModule(mod, undefined, Date.now(), true);
    }
  }

  bumpDevServerRevision();
}
