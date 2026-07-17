interface HotUpdateModule {
  file?: string | null;
}

interface ClientModuleGraph {
  getModulesByFile(file: string): Set<unknown> | undefined;
}

export function shouldReloadClientForServerUpdate(
  modules: HotUpdateModule[],
  clientModuleGraph: ClientModuleGraph
): boolean {
  return modules.some((mod) => {
    if (!mod.file) return false;

    // CSS Modules export generated class names that are consumed during SSR.
    // Client-only HMR can otherwise update the class map before the cached
    // server renderer, producing different markup when a widget hydrates.
    if (/\.module\.css$/i.test(mod.file)) return true;

    return !clientModuleGraph.getModulesByFile(mod.file)?.size;
  });
}
