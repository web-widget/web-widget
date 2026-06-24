// Based on the code in the MIT licensed `astro` package.

import path from 'node:path';
import type {
  LinkDescriptor,
  ScriptDescriptor,
  StyleDescriptor,
} from '@web-widget/helpers';

import type { EnvironmentModuleNode } from 'vite';
import { isCSSRequest } from 'vite';

import type { DynamicImportPredicate } from '@/types';
import type { ServerDevEnvironment } from '@/internal/environment';
import {
  canonicalModuleKey,
  normalizeFilterId,
  stripModuleIdQuery,
  toManifestFilterKey,
  unwrapViteId,
} from '@/internal/module-id';
import { getCachedMeta, setCachedMeta } from './meta-cache';

type ServerModuleDependencyKeys = {
  filterDisabled: boolean;
  importDepKeys: Set<string>;
  matchedDynamicImportKeys: Set<string>;
};

export async function getMeta(
  filePath: string,
  serverEnvironment: ServerDevEnvironment,
  dynamicImportPredicate?: DynamicImportPredicate,
  cacheRevision?: number
): Promise<{
  link: LinkDescriptor[];
  style: StyleDescriptor[];
  script: ScriptDescriptor[];
}> {
  if (cacheRevision !== undefined) {
    const cached = getCachedMeta(filePath, cacheRevision);
    if (cached) {
      return cached;
    }
  }

  const script: ScriptDescriptor[] = [];

  const { urls: styleUrls, styles } = await getStylesForURL(
    filePath,
    serverEnvironment,
    dynamicImportPredicate
  );
  let link: LinkDescriptor[] = styleUrls.map((href) => ({
    rel: 'stylesheet',
    href,
  }));

  let style: StyleDescriptor[] = styles.map(({ id, url, content }) => {
    script.push({
      type: 'module',
      src: url,
    });
    return {
      'data-vite-dev-id': id,
      content,
    };
  });

  const meta = { script, style, link };

  if (cacheRevision !== undefined) {
    setCachedMeta(filePath, cacheRevision, meta);
  }

  return meta;
}

interface ImportedStyle {
  id: string;
  url: string;
  content: string;
}

async function getStylesForURL(
  filePath: string,
  serverEnvironment: ServerDevEnvironment,
  dynamicImportPredicate?: DynamicImportPredicate
): Promise<{ urls: string[]; styles: ImportedStyle[] }> {
  const importedCssUrls = new Set<string>();
  const importedStylesMap = new Map<string, ImportedStyle>();

  const root = serverEnvironment.root;

  for await (const importedModule of crawlGraph(
    serverEnvironment,
    filePath,
    true,
    new Set(),
    root,
    dynamicImportPredicate
  )) {
    if (isBuildableCSSRequest(importedModule.url)) {
      let serverModule: Record<string, any>;
      try {
        serverModule =
          importedModule.ssrModule ??
          (await serverEnvironment.importModule(importedModule.url));
      } catch {
        continue;
      }
      if (typeof serverModule?.default === 'string') {
        importedStylesMap.set(importedModule.url, {
          id: importedModule.id ?? importedModule.url,
          url: importedModule.url,
          content: serverModule.default,
        });
      } else {
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
  dynamicImportPredicate?: DynamicImportPredicate
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
  if (dynamicImportPredicate && tr.dynamicDeps?.length) {
    for (const dep of tr.dynamicDeps) {
      try {
        const r = await serverEnvironment.resolveId(dep, importer);
        if (!r?.id) {
          continue;
        }
        const manifestKey = toManifestFilterKey(r.id, root);
        if (dynamicImportPredicate(manifestKey)) {
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

const fileExtensionsNeedingServerModule = new Set<string>();

async function* crawlGraph(
  serverEnvironment: ServerDevEnvironment,
  _id: string,
  isRootFile: boolean,
  scanned: Set<string>,
  root: string,
  dynamicImportPredicate?: DynamicImportPredicate
): AsyncGenerator<EnvironmentModuleNode, void, unknown> {
  const id = unwrapViteId(_id);
  const importedModules = new Set<EnvironmentModuleNode>();

  const moduleEntriesForId = isRootFile
    ? (serverEnvironment.getModulesByFile(id) ?? new Set())
    : new Set([serverEnvironment.getModuleById(id)]);

  for (const entry of moduleEntriesForId) {
    if (!entry) {
      continue;
    }
    if (id === entry.id) {
      scanned.add(id);
      const entryPath = stripModuleIdQuery(id);
      const entryIsStyle = isCSSRequest(entryPath) || isCSSRequest(id);

      const { filterDisabled, importDepKeys, matchedDynamicImportKeys } =
        await resolveServerModuleDependencyKeys(
          serverEnvironment,
          entry,
          root,
          dynamicImportPredicate
        );

      for (const importedModule of entry.importedModules) {
        if (!importedModule.id) continue;

        const importedModulePathname = canonicalModuleKey(importedModule.id);
        if (entryIsStyle && !isCSSRequest(importedModulePathname)) {
          continue;
        }

        const isFileTypeNeedingServerModule =
          fileExtensionsNeedingServerModule.has(
            path.extname(importedModulePathname)
          );

        if (isFileTypeNeedingServerModule) {
          const mod = serverEnvironment.getModuleById(importedModule.id);
          if (!mod?.ssrModule) {
            try {
              await serverEnvironment.importModule(importedModule.id);
            } catch {
              /** Likely an out-of-date module entry! Silently continue. */
            }
          }
        }

        if (!isImportedBy(id, importedModule)) {
          continue;
        }

        if (!filterDisabled) {
          const edge = classifyImportEdge(
            importedModule,
            importDepKeys,
            matchedDynamicImportKeys
          );
          if (edge === 'none') {
            continue;
          }
          importedModules.add(importedModule);
        } else {
          importedModules.add(importedModule);
        }
      }
    }
  }

  for (const importedModule of importedModules) {
    if (!importedModule.id || scanned.has(importedModule.id)) {
      continue;
    }

    yield importedModule;
    yield* crawlGraph(
      serverEnvironment,
      importedModule.id,
      false,
      scanned,
      root,
      dynamicImportPredicate
    );
  }
}

function isImportedBy(parent: string, entry: EnvironmentModuleNode) {
  for (const importer of entry.importers) {
    if (importer.id === parent) {
      return true;
    }
  }
  return false;
}
