import type { ModuleLoader, ModuleNode } from "../loader/index";
import { isCSSRequest, unwrapId } from "./util";

import npath from "node:path";

/**
 * List of file extensions signalling we can (and should) SSR ahead-of-time
 * See usage below
 */
const fileExtensionsToSSR: Set<string> = new Set([]);

const STRIP_QUERY_PARAMS_REGEX = /\?.*$/;
const PROPAGATED_ASSET_REGEX = /\?propagatedAssets/;

/** recursively crawl the module graph to get all style files imported by parent id */
export async function* crawlGraph(
  loader: ModuleLoader,
  _id: string,
  isRootFile: boolean,
  scanned = new Set<string>()
): AsyncGenerator<ModuleNode, void, unknown> {
  const id = unwrapId(_id);
  const importedModules = new Set<ModuleNode>();

  const moduleEntriesForId = isRootFile
    ? // "getModulesByFile" pulls from a delayed module cache (fun implementation detail),
      // So we can get up-to-date info on initial server load.
      // Needed for slower CSS preprocessing like Tailwind
      loader.getModulesByFile(id) ?? new Set()
    : // For non-root files, we're safe to pull from "getModuleById" based on testing.
      // TODO: Find better invalidation strat to use "getModuleById" in all cases!
      new Set([loader.getModuleById(id)]);

  // Collect all imported modules for the module(s).
  for (const entry of moduleEntriesForId) {
    // Handle this in case an module entries weren't found for ID
    // This seems possible with some virtual IDs
    if (!entry) {
      continue;
    }
    if (id === entry.id) {
      scanned.add(id);
      const entryIsStyle = isCSSRequest(id);

      for (const importedModule of entry.importedModules) {
        // A propagation stopping point is a module with the ?propagatedAssets flag.
        // When we encounter one of these modules we don't want to continue traversing.
        let isPropagationStoppingPoint = false;
        // some dynamically imported modules are *not* server rendered in time
        // to only SSR modules that we can safely transform, we check against
        // a list of file extensions based on our built-in vite plugins
        if (importedModule.id) {
          // Strip special query params like "?content".
          // NOTE: Cannot use `new URL()` here because not all IDs will be valid paths.
          // For example, `virtual:image-loader` if you don't have the plugin installed.
          const importedModulePathname = importedModule.id.replace(
            STRIP_QUERY_PARAMS_REGEX,
            ""
          );
          // If the entry is a style, skip any modules that are not also styles.
          // Tools like Tailwind might add HMR dependencies as `importedModules`
          // but we should skip them--they aren't really imported. Without this,
          // every hoisted script in the project is added to every page!
          if (entryIsStyle && !isCSSRequest(importedModulePathname)) {
            continue;
          }
          const isFileTypeNeedingSSR = fileExtensionsToSSR.has(
            npath.extname(importedModulePathname)
          );
          isPropagationStoppingPoint = PROPAGATED_ASSET_REGEX.test(
            importedModule.id
          );
          if (
            isFileTypeNeedingSSR &&
            // Should not SSR a module with ?propagatedAssets
            !isPropagationStoppingPoint
          ) {
            const mod = loader.getModuleById(importedModule.id);
            if (!mod?.ssrModule) {
              try {
                await loader.import(importedModule.id);
              } catch {
                /** Likely an out-of-date module entry! Silently continue. */
              }
            }
          }
        }
        if (!isPropagationStoppingPoint) {
          importedModules.add(importedModule);
        }
      }
    }
  }

  // scan imported modules for CSS imports & add them to our collection.
  // Then, crawl that file to follow and scan all deep imports as well.
  for (const importedModule of importedModules) {
    if (!importedModule.id || scanned.has(importedModule.id)) {
      continue;
    }

    yield importedModule;
    yield* crawlGraph(loader, importedModule.id, false, scanned);
  }
}
