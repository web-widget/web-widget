// Based on the code in the MIT licensed `astro` package.

import type {
  LinkDescriptor,
  ScriptDescriptor,
  StyleDescriptor,
} from '@web-widget/helpers';

import type { EnvironmentModuleNode } from 'vite';
import { isCSSRequest } from 'vite';

import type { WidgetModuleFilter } from '@/types';
import type { ServerDevEnvironment } from '@/internal/environment';
import {
  canonicalModuleKey,
  cssExcludeRE,
  normalizeFilterId,
  stripModuleIdQuery,
  toManifestFilterKey,
  unwrapViteId,
} from '@/internal/module-id';
import { matchesWidgetModule } from '@/internal/collect-route-assets';

type ServerModuleDependencyKeys = {
  filterDisabled: boolean;
  importDepKeys: Set<string>;
  matchedDynamicImportKeys: Set<string>;
};

export async function getMeta(
  filePath: string,
  serverEnvironment: ServerDevEnvironment,
  widgetModuleFilter?: WidgetModuleFilter
): Promise<{
  link: LinkDescriptor[];
  style: StyleDescriptor[];
  script: ScriptDescriptor[];
}> {
  const script: ScriptDescriptor[] = [];
  const style: StyleDescriptor[] = [];

  const { styles, moduleScripts } = await getCssForURL(
    filePath,
    serverEnvironment,
    widgetModuleFilter
  );

  // CSS modules with cached content: emit <style> for immediate CSS
  // (no FOUC) and <script> so Vite's client can hot-update the <style>
  // via updateStyle().
  for (const { id, url, content } of styles) {
    script.push({ type: 'module', src: url });
    style.push({ 'data-vite-dev-id': id, content });
  }

  // CSS modules without cached content (transform failed and cache was
  // empty): emit <script> to load the module (enables HMR) and an empty
  // <style data-vite-dev-id> so Vite's client registers it in sheetsMap
  // and updateStyle() can fill/update it. This mirrors Astro's approach
  // — never use <link rel="stylesheet"> because it registers in
  // linkSheetsMap which makes updateStyle() short-circuit and blocks HMR.
  for (const { id, url } of moduleScripts) {
    script.push({ type: 'module', src: url });
    style.push({ 'data-vite-dev-id': id, content: '' });
  }

  return { script, style, link: [] };
}

interface ImportedStyle {
  id: string;
  url: string;
  content: string;
}

interface ImportedModuleScript {
  id: string;
  url: string;
}

async function getCssForURL(
  filePath: string,
  serverEnvironment: ServerDevEnvironment,
  widgetModuleFilter?: WidgetModuleFilter
): Promise<{
  styles: ImportedStyle[];
  moduleScripts: ImportedModuleScript[];
}> {
  const importedStylesMap = new Map<string, ImportedStyle>();
  const importedModuleScriptsMap = new Map<string, ImportedModuleScript>();

  const root = serverEnvironment.root;

  for await (const importedModule of crawlGraph(
    serverEnvironment,
    filePath,
    true,
    new Set(),
    root,
    widgetModuleFilter
  )) {
    await appendCssModuleStyles(
      serverEnvironment,
      importedModule.url,
      importedModule.id ?? importedModule.url,
      importedStylesMap,
      importedModuleScriptsMap
    );
  }

  return {
    styles: [...importedStylesMap.values()],
    moduleScripts: [...importedModuleScriptsMap.values()],
  };
}

async function appendCssModuleStyles(
  serverEnvironment: ServerDevEnvironment,
  moduleUrl: string,
  moduleId: string,
  importedStylesMap: Map<string, ImportedStyle>,
  importedModuleScriptsMap: Map<string, ImportedModuleScript>
): Promise<void> {
  if (!isBuildableCSSRequest(moduleUrl)) {
    return;
  }

  // Trigger the transform pipeline so the `transform` hook fills
  // `cssContentCache` with the raw CSS content. We use `transformRequest`
  // rather than `importModule` to avoid executing the module's JS code
  // (e.g. Vue SFC style sub-modules call `updateStyle()` at runtime,
  // which is a meaningless side effect in SSR). This mirrors Astro's
  // approach — the transform hook receives the raw CSS from the load
  // stage before Vite's cssPlugin converts it to an empty JS module.
  try {
    await serverEnvironment.transformRequest(moduleUrl);
  } catch {
    // Transform may fail for virtual or special modules. Fall through
    // to cache lookup — the content may already be cached from a
    // previous transform, or we emit an empty <style> as fallback.
  }

  const cachedCss = cssContentCache.get(moduleId);
  if (typeof cachedCss === 'string' && cachedCss.length > 0) {
    importedStylesMap.set(moduleUrl, {
      id: moduleId,
      url: moduleUrl,
      content: cachedCss,
    });
    return;
  }

  importedModuleScriptsMap.set(moduleUrl, {
    id: moduleId,
    url: moduleUrl,
  });
}

/**
 * Cache of CSS content keyed by module id. Populated by the `transform`
 * hook in the dev server plugin — the hook receives the raw CSS from the
 * `load` stage (before Vite's cssPlugin converts it to an empty JS module
 * for SSR). `appendCssModuleStyles` reads from this cache to emit
 * `<style>` tags with content, avoiding FOUC.
 */
export const cssContentCache = new Map<string, string>();

const isBuildableCSSRequest = (request: string): boolean =>
  isCSSRequest(request) && !cssExcludeRE.some((re) => re.test(request));

function moduleIdentityKey(id: string): string {
  return unwrapViteId(id);
}

function moduleKeysMatch(a: string, b: string): boolean {
  return canonicalModuleKey(a) === canonicalModuleKey(b);
}

function moduleNodeKeys(mod: EnvironmentModuleNode): string[] {
  const keys: string[] = [];
  if (mod.id) {
    keys.push(canonicalModuleKey(mod.id));
  }
  if (mod.file) {
    const k = canonicalModuleKey(mod.file);
    if (!keys.includes(k)) {
      keys.push(k);
    }
  }
  return keys;
}

function classifyImportEdge(
  mod: EnvironmentModuleNode,
  importDepKeys: Set<string>,
  matchedDynamicImportKeys: Set<string>
): 'import' | 'dynamic-import' | 'none' {
  let fromImport = false;
  let fromDynamicImport = false;
  for (const k of moduleNodeKeys(mod)) {
    if (importDepKeys.has(k)) {
      fromImport = true;
    }
    if (matchedDynamicImportKeys.has(k)) {
      fromDynamicImport = true;
    }
  }
  if (fromImport) {
    return 'import';
  }
  if (fromDynamicImport) {
    return 'dynamic-import';
  }
  return 'none';
}

async function ensureServerTransformResult(
  serverEnvironment: ServerDevEnvironment,
  mod: EnvironmentModuleNode
) {
  if (mod.transformResult) {
    return;
  }
  try {
    await serverEnvironment.transformRequest(normalizeFilterId(mod.url));
  } catch {
    /** transform may fail for virtual / special modules */
  }
}

async function resolveSpecifierKeys(
  serverEnvironment: ServerDevEnvironment,
  importer: string,
  specifiers: readonly string[] | undefined
): Promise<Set<string>> {
  const keys = new Set<string>();
  for (const spec of specifiers ?? []) {
    try {
      const r = await serverEnvironment.resolveId(spec, importer);
      if (r?.id) {
        keys.add(canonicalModuleKey(r.id));
      }
    } catch {
      /** unresolved optional deps, etc. */
    }
  }
  return keys;
}

async function resolveServerModuleDependencyKeys(
  serverEnvironment: ServerDevEnvironment,
  entry: EnvironmentModuleNode,
  root: string,
  widgetModuleFilter?: WidgetModuleFilter
): Promise<ServerModuleDependencyKeys> {
  const entryPath = entry.id ? canonicalModuleKey(entry.id) : '';
  const entryIsStyle =
    entry.type === 'css' ||
    isCSSRequest(entryPath) ||
    isCSSRequest(entry.id ?? '');

  if (entryIsStyle) {
    return {
      filterDisabled: true,
      importDepKeys: new Set(),
      matchedDynamicImportKeys: new Set(),
    };
  }

  await ensureServerTransformResult(serverEnvironment, entry);

  const tr = entry.transformResult;
  const importer = entry.file ?? entry.id;
  if (!tr || !importer) {
    return {
      filterDisabled: true,
      importDepKeys: new Set(),
      matchedDynamicImportKeys: new Set(),
    };
  }

  const importDepKeys = await resolveSpecifierKeys(
    serverEnvironment,
    importer,
    tr.deps
  );

  const matchedDynamicImportKeys = new Set<string>();
  if (tr.dynamicDeps?.length) {
    for (const dep of tr.dynamicDeps) {
      try {
        const r = await serverEnvironment.resolveId(dep, importer);
        if (!r?.id) {
          continue;
        }
        const relativeKey = toManifestFilterKey(r.id, root);
        if (matchesWidgetModule(root, relativeKey, r.id, widgetModuleFilter)) {
          matchedDynamicImportKeys.add(canonicalModuleKey(r.id));
        }
      } catch {
        /** */
      }
    }
  }

  return {
    filterDisabled: false,
    importDepKeys,
    matchedDynamicImportKeys,
  };
}

async function resolveWidgetModulesFromDynamicDeps(
  serverEnvironment: ServerDevEnvironment,
  entry: EnvironmentModuleNode,
  root: string,
  widgetModuleFilter?: WidgetModuleFilter
): Promise<EnvironmentModuleNode[]> {
  await ensureServerTransformResult(serverEnvironment, entry);

  const tr = entry.transformResult;
  const importer = entry.file ?? entry.id;
  if (!tr?.dynamicDeps?.length || !importer) {
    return [];
  }

  const modules: EnvironmentModuleNode[] = [];
  for (const dep of tr.dynamicDeps) {
    try {
      const r = await serverEnvironment.resolveId(dep, importer);
      if (!r?.id) {
        continue;
      }
      const relativeKey = toManifestFilterKey(r.id, root);
      if (!matchesWidgetModule(root, relativeKey, r.id, widgetModuleFilter)) {
        continue;
      }

      let mod = serverEnvironment.getModuleById(r.id);
      if (!mod) {
        await serverEnvironment.transformRequest(normalizeFilterId(r.id));
        mod = serverEnvironment.getModuleById(r.id) ?? undefined;
      }
      if (mod?.id) {
        modules.push(mod);
      }
    } catch {
      /** unresolved optional deps, etc. */
    }
  }

  return modules;
}

async function* crawlGraph(
  serverEnvironment: ServerDevEnvironment,
  _id: string,
  isRootFile: boolean,
  scanned: Set<string>,
  root: string,
  widgetModuleFilter?: WidgetModuleFilter
): AsyncGenerator<EnvironmentModuleNode, void, unknown> {
  const id = unwrapViteId(_id);
  const importedModules = new Set<EnvironmentModuleNode>();

  const moduleEntriesForId = isRootFile
    ? (serverEnvironment.getModulesByFile(id) ?? new Set())
    : new Set([serverEnvironment.getModuleById(id)]);

  for (const entry of moduleEntriesForId) {
    if (!entry?.id) {
      continue;
    }

    const entryId = entry.id;
    if (!isRootFile && !moduleKeysMatch(id, entryId)) {
      continue;
    }

    scanned.add(moduleIdentityKey(entryId));
    const entryPath = stripModuleIdQuery(entryId);
    const entryIsStyle = isCSSRequest(entryPath) || isCSSRequest(entryId);

    const { filterDisabled, importDepKeys, matchedDynamicImportKeys } =
      await resolveServerModuleDependencyKeys(
        serverEnvironment,
        entry,
        root,
        widgetModuleFilter
      );

    for (const importedModule of entry.importedModules) {
      if (!importedModule.id) continue;

      const importedModulePathname = canonicalModuleKey(importedModule.id);
      if (entryIsStyle && !isCSSRequest(importedModulePathname)) {
        continue;
      }

      if (!isImportedBy(entryId, importedModule) && !isRootFile) {
        continue;
      }

      if (!filterDisabled) {
        const edge = classifyImportEdge(
          importedModule,
          importDepKeys,
          matchedDynamicImportKeys
        );
        const isRootCss =
          isRootFile && isBuildableCSSRequest(importedModule.url);
        if (edge === 'none' && !isRootCss) {
          continue;
        }
        importedModules.add(importedModule);
      } else {
        importedModules.add(importedModule);
      }
    }

    if (!filterDisabled) {
      for (const widgetModule of await resolveWidgetModulesFromDynamicDeps(
        serverEnvironment,
        entry,
        root,
        widgetModuleFilter
      )) {
        importedModules.add(widgetModule);
      }
    }
  }

  for (const importedModule of importedModules) {
    if (!importedModule.id) {
      continue;
    }
    const importedKey = moduleIdentityKey(importedModule.id);
    if (scanned.has(importedKey)) {
      continue;
    }

    yield importedModule;
    yield* crawlGraph(
      serverEnvironment,
      importedModule.id,
      false,
      scanned,
      root,
      widgetModuleFilter
    );
  }
}

function isImportedBy(parentId: string, entry: EnvironmentModuleNode) {
  const parentKey = moduleIdentityKey(parentId);
  for (const importer of entry.importers) {
    if (importer.id && moduleIdentityKey(importer.id) === parentKey) {
      return true;
    }
  }
  return false;
}
