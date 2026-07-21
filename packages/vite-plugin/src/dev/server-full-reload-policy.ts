import { CSS_MODULE_RE } from '@/internal/module-id';

interface HotUpdateModule {
  file?: string | null;
}

interface ClientModuleGraph {
  getModulesByFile(file: string): Set<unknown> | undefined;
}

export function shouldReloadClientForServerUpdate(
  modules: HotUpdateModule[],
  clientModuleGraph: ClientModuleGraph,
  stableDevCssModuleNames: boolean
): boolean {
  return modules.some((mod) => {
    if (!mod.file) return false;

    // A custom CSS Modules name generator may depend on CSS content. Keep the
    // conservative reload unless the router installed stable dev class names.
    if (CSS_MODULE_RE.test(mod.file) && !stableDevCssModuleNames) {
      return true;
    }

    return !clientModuleGraph.getModulesByFile(mod.file)?.size;
  });
}
