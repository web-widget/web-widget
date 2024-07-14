// Based on the code in the MIT licensed `astro` package.

import path from 'node:path';
import type {
  LinkDescriptor,
  ScriptDescriptor,
  StyleDescriptor,
} from '@web-widget/helpers';

import type { ViteDevServer, ModuleNode } from 'vite';
import { isCSSRequest } from 'vite';

export async function getMeta(
  filePath: string,
  viteDevServer: ViteDevServer
): Promise<{
  link: LinkDescriptor[];
  style: StyleDescriptor[];
  script: ScriptDescriptor[];
}> {
  // Add hoisted script tags
  const script: ScriptDescriptor[] = [];

  // Pass framework CSS in as style tags to be appended to the page.
  const { urls: styleUrls, styles } = await getStylesForURL(
    filePath,
    viteDevServer
  );
  let link: LinkDescriptor[] = styleUrls.map((href) => ({
    rel: 'stylesheet',
    href,
  }));

  let style: StyleDescriptor[] = styles.map(({ id, url, content }) => {
    // Vite handles HMR for styles injected as scripts
    script.push({
      type: 'module',
      src: url,
    });
    // But we still want to inject the styles to avoid FOUC. The style tags
    // should emulate what Vite injects so further HMR works as expected.
    return {
      'data-vite-dev-id': id,
      content,
    };
  });

  return { script, style, link };
}

interface ImportedStyle {
  id: string;
  url: string;
  content: string;
}

/** Given a filePath URL, crawl Vite’s module graph to find all style imports. */
async function getStylesForURL(
  filePath: string,
  viteDevServer: ViteDevServer
): Promise<{ urls: string[]; styles: ImportedStyle[] }> {
  const importedCssUrls = new Set<string>();
  // Map of url to injected style object. Use a `url` key to deduplicate styles
  const importedStylesMap = new Map<string, ImportedStyle>();

  for await (const importedModule of crawlGraph(
    viteDevServer,
    filePath,
    true
  )) {
    if (isBuildableCSSRequest(importedModule.url)) {
      let ssrModule: Record<string, any>;
      try {
        // The SSR module is possibly not loaded. Load it if it's null.
        ssrModule =
          importedModule.ssrModule ??
          (await viteDevServer.ssrLoadModule(importedModule.url));
      } catch {
        // The module may not be inline-able, e.g. SCSS partials. Skip it as it may already
        // be inlined into other modules if it happens to be in the graph.
        continue;
      }
      if (
        typeof ssrModule?.default === 'string' // ignore JS module styles
      ) {
        importedStylesMap.set(importedModule.url, {
          id: importedModule.id ?? importedModule.url,
          url: importedModule.url,
          content: ssrModule.default,
        });
      } else {
        // NOTE: We use the `url` property here. `id` would break Windows.
        importedCssUrls.add(importedModule.url);
      }
    }
  }

  return {
    urls: [...importedCssUrls],
    styles: [...importedStylesMap.values()],
  };
}

const rawRE = /(?:\?|&)raw(?:&|$)/;
const inlineRE = /(?:\?|&)inline\b/;

const isBuildableCSSRequest = (request: string): boolean =>
  isCSSRequest(request) && !rawRE.test(request) && !inlineRE.test(request);

const VALID_ID_PREFIX = `/@id/`;

// Strip valid id prefix. This is prepended to resolved Ids that are
// not valid browser import specifiers by the importAnalysis plugin.
function unwrapId(id: string): string {
  return id.startsWith(VALID_ID_PREFIX) ? id.slice(VALID_ID_PREFIX.length) : id;
}

/**
 * List of file extensions signalling we can (and should) SSR ahead-of-time
 * See usage below
 */
const fileExtensionsToSSR = new Set();

const STRIP_QUERY_PARAMS_REGEX = /\?.*$/;

/** recursively crawl the module graph to get all style files imported by parent id */
async function* crawlGraph(
  viteDevServer: ViteDevServer,
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
      (viteDevServer.moduleGraph.getModulesByFile(id) ?? new Set())
    : // For non-root files, we're safe to pull from "getModuleById" based on testing.
      // TODO: Find better invalidation start to use "getModuleById" in all cases!
      new Set([viteDevServer.moduleGraph.getModuleById(id)]);

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
        if (!importedModule.id) continue;

        // some dynamically imported modules are *not* server rendered in time
        // to only SSR modules that we can safely transform, we check against
        // a list of file extensions based on our built-in vite plugins

        // Strip special query params like "?content".
        // NOTE: Cannot use `new URL()` here because not all IDs will be valid paths.
        // For example, `virtual:image-loader` if you don't have the plugin installed.
        const importedModulePathname = importedModule.id.replace(
          STRIP_QUERY_PARAMS_REGEX,
          ''
        );
        // If the entry is a style, skip any modules that are not also styles.
        // Tools like Tailwind might add HMR dependencies as `importedModules`
        // but we should skip them--they aren't really imported. Without this,
        // every hoisted script in the project is added to every page!
        if (entryIsStyle && !isCSSRequest(importedModulePathname)) {
          continue;
        }

        const isFileTypeNeedingSSR = fileExtensionsToSSR.has(
          path.extname(importedModulePathname)
        );

        if (isFileTypeNeedingSSR) {
          const mod = viteDevServer.moduleGraph.getModuleById(
            importedModule.id
          );
          if (!mod?.ssrModule) {
            try {
              await viteDevServer.ssrLoadModule(importedModule.id);
            } catch {
              /** Likely an out-of-date module entry! Silently continue. */
            }
          }
        }

        // Make sure the `importedModule` traversed is explicitly imported by the user, and not by HMR
        if (isImportedBy(id, importedModule)) {
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
    yield* crawlGraph(viteDevServer, importedModule.id, false, scanned);
  }
}

// Verify true imports. If the child module has the parent as an importers, it's
// a real import.
function isImportedBy(parent: string, entry: ModuleNode) {
  for (const importer of entry.importers) {
    if (importer.id === parent) {
      return true;
    }
  }
  return false;
}
