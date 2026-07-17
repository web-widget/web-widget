import { bumpDevServerRevision } from './dev-server-cache';
import type { ResolvedWebRouterConfig } from '@/types';

/** Minimal server module graph surface for dev invalidation tests. */
export interface ServerDevModuleGraph {
  getModulesByFile(file: string): Set<ServerDevModule> | undefined;
  invalidateModule(
    mod: ServerDevModule,
    seen?: Set<ServerDevModule>,
    timestamp?: number,
    isHmr?: boolean
  ): void;
}

export interface ServerDevModule {
  readonly id?: string | null;
  readonly importers?: Set<ServerDevModule>;
}

function collectImporterChain(
  module: ServerDevModule,
  collected: Set<ServerDevModule>
) {
  if (collected.has(module)) return;
  collected.add(module);
  for (const importer of module.importers ?? []) {
    collectImporterChain(importer, collected);
  }
}

export async function invalidateServerDevModules(
  moduleGraph: ServerDevModuleGraph,
  config: ResolvedWebRouterConfig,
  changedFiles: string[] = []
): Promise<void> {
  const files = [
    ...changedFiles,
    config.input.server.entry,
    config.input.server.routemap,
  ];
  const timestamp = Date.now();
  const modulesToInvalidate = new Set<ServerDevModule>();

  for (const file of files) {
    const modules = moduleGraph.getModulesByFile(file);
    if (!modules) {
      continue;
    }
    for (const mod of modules) {
      // Widget styles are serialized into importer transforms as devStyles.
      // CSS can also originate from Vue/Svelte/etc. module transforms, so
      // every changed server module must cross accepted HMR boundaries.
      collectImporterChain(mod, modulesToInvalidate);
    }
  }

  const invalidated = new Set<ServerDevModule>();
  for (const mod of modulesToInvalidate) {
    moduleGraph.invalidateModule(mod, invalidated, timestamp, true);
  }

  bumpDevServerRevision();
}
