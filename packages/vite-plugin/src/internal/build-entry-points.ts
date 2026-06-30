import path from 'node:path';
import type { RouteMap } from '@/types';
import { isPathInsideRoot, normalizePath } from '@/internal/path';
import { stripModuleIdQuery } from '@/internal/module-id';
import {
  collectRouteModuleAssets,
  createRouteAssetCaches,
  discoverWidgetModulePaths,
} from './collect-route-assets';
import type { RouteAssetCaches } from './collect-route-assets';
import type { DynamicImportPredicate } from '@/types';

export type BuildEntryPoints = {
  points: Record<string, string>;
  exposures: Set<string>;
};

const SOURCE_ROOT_PREFIX = /^(?:routes|pages|src|app)[/\\]/;

function sanitizeEntryName(segments: string[]): string {
  return segments.join('.').replace(/[^a-zA-Z0-9@_.-]+/g, '_');
}

/** Collapse trailing `index` segments so directory index modules map to their parent path. */
export function collapseIndexPathSegments(segments: string[]): string[] {
  const result = segments.filter(Boolean);

  while (result.length > 0) {
    const last = result[result.length - 1]!;

    if (last === 'index') {
      result.pop();
      if (result.length === 0) {
        result.push('_root');
      }
      continue;
    }

    const indexAtMatch = last.match(/^index(@.+)$/);
    if (indexAtMatch) {
      result.pop();
      const suffix = indexAtMatch[1]!;
      if (result.length === 0) {
        result.push(`_root${suffix}`);
      } else {
        result[result.length - 1] += suffix;
      }
      continue;
    }

    const indexDotMatch = last.match(/^index\.(.+)$/);
    if (indexDotMatch) {
      result.pop();
      const suffix = indexDotMatch[1]!;
      if (result.length === 0) {
        result.push(`_root.${suffix}`);
      } else {
        result[result.length - 1] += `.${suffix}`;
      }
      continue;
    }

    break;
  }

  return result;
}

export function entryNameFromModulePath(
  modulePath: string,
  root: string
): string {
  const ext = path.extname(modulePath);
  const withoutExt = modulePath.slice(0, modulePath.length - ext.length);
  const relative = path.relative(root, withoutExt);
  const withoutPrefix = relative.replace(SOURCE_ROOT_PREFIX, '');
  const segments = withoutPrefix.split(/[/\\]/);
  const lastIndex = segments.length - 1;

  if (ext && lastIndex >= 0) {
    const last = segments[lastIndex]!;
    if (last.includes('@widget') && !last.startsWith('index')) {
      segments[lastIndex] = `${last}${ext}`;
    }
  }

  return entryNameFromRelativePath(segments.filter(Boolean).join(path.sep));
}

export function entryNameFromRelativePath(
  relativePathWithoutExt: string
): string {
  const segments = relativePathWithoutExt
    .replace(SOURCE_ROOT_PREFIX, '')
    .split(/[/\\]/);
  return normalizePath(sanitizeEntryName(collapseIndexPathSegments(segments)));
}

export function assetBaseNameFromModuleId(
  moduleId: string,
  root: string
): string | undefined {
  const pathname = stripModuleIdQuery(moduleId);
  if (!pathname || pathname.includes('\0')) {
    return undefined;
  }

  const resolvedRoot = path.resolve(root);
  const resolvedModule = path.resolve(pathname);
  if (!isPathInsideRoot(resolvedRoot, resolvedModule)) {
    return undefined;
  }

  const ext = path.extname(resolvedModule);
  if (!ext) {
    return undefined;
  }

  return entryNameFromModulePath(resolvedModule, resolvedRoot);
}

type BuildChunkInfo = {
  facadeModuleId: string | null;
  moduleIds?: string[];
  name: string;
};

function resolveChunkBaseNameFromInfo(
  chunkInfo: BuildChunkInfo,
  root: string
): string | undefined {
  const moduleIds = [
    chunkInfo.facadeModuleId,
    ...(chunkInfo.moduleIds ?? []),
  ].filter((value): value is string => Boolean(value));

  for (const moduleId of moduleIds) {
    const baseName = assetBaseNameFromModuleId(moduleId, root);
    if (baseName) {
      return baseName;
    }
  }

  return undefined;
}

export function createServerAssetFileNameResolver(options: {
  assetsDir: string;
  root: string;
  entryId: string;
  serverEntryOutputName: string;
}) {
  const { assetsDir, entryId, root, serverEntryOutputName } = options;

  return {
    entryFileNames(chunkInfo: BuildChunkInfo) {
      if (chunkInfo.name === entryId) {
        return `${serverEntryOutputName}.js`;
      }

      const baseName =
        resolveChunkBaseNameFromInfo(chunkInfo, root) ?? chunkInfo.name;
      return `${assetsDir}/${baseName}.js`;
    },
    chunkFileNames(chunkInfo: BuildChunkInfo) {
      const baseName =
        resolveChunkBaseNameFromInfo(chunkInfo, root) ?? chunkInfo.name;
      return `${assetsDir}/${baseName}.js`;
    },
    assetFileNames: `${assetsDir}/[name][extname]`,
  };
}

export function createServerManualChunks(root: string) {
  return (moduleId: string): string | undefined => {
    const baseName = assetBaseNameFromModuleId(moduleId, root);
    if (!baseName) {
      return undefined;
    }

    if (
      baseName.includes('@route') ||
      baseName.includes('@middleware') ||
      baseName.includes('@action') ||
      baseName.includes('@layout') ||
      baseName.includes('@fallback') ||
      baseName.includes('@widget')
    ) {
      return baseName;
    }

    return undefined;
  };
}

function resolveEntryBasename(
  modulePath: string,
  root: string,
  points: Record<string, string>
): string {
  const basename = entryNameFromModulePath(modulePath, root);
  const existing = points[basename];
  if (!existing || existing === modulePath) {
    return basename;
  }

  const ext = path.extname(modulePath).slice(1);
  if (!ext) {
    throw new Error('Duplicate entry point: ' + basename);
  }

  const disambiguated = `${basename}.${ext}`;
  if (points[disambiguated] && points[disambiguated] !== modulePath) {
    throw new Error('Duplicate entry point: ' + disambiguated);
  }

  return disambiguated;
}

function addEntryPoint(
  points: Record<string, string>,
  exposures: Set<string>,
  modulePath: string,
  root: string,
  expose: boolean
) {
  const basename = resolveEntryBasename(modulePath, root, points);
  if (points[basename] === modulePath) {
    return basename;
  }

  points[basename] = modulePath;
  if (expose) {
    exposures.add(basename);
  }
  return basename;
}

export function collectRoutemapModulePaths(
  manifest: RouteMap,
  routemapPath: string,
  types: (keyof RouteMap)[]
): { type: keyof RouteMap; module: string; modulePath: string }[] {
  const routemapDir = path.dirname(routemapPath);
  const modules: {
    type: keyof RouteMap;
    module: string;
    modulePath: string;
  }[] = [];

  for (const type of types) {
    const value = manifest[type];
    if (Array.isArray(value)) {
      for (const mod of value) {
        if (typeof mod === 'object' && mod.module) {
          modules.push({
            type,
            module: mod.module,
            modulePath: path.resolve(routemapDir, mod.module),
          });
        }
      }
    } else if (typeof value === 'object' && value?.module) {
      modules.push({
        type,
        module: value.module,
        modulePath: path.resolve(routemapDir, value.module),
      });
    }
  }

  return modules;
}

export function resolveServerEntryPoints(
  manifest: RouteMap,
  routemapPath: string,
  root: string
): BuildEntryPoints {
  const serverTypes: (keyof RouteMap)[] = [
    'routes',
    'actions',
    'middlewares',
    'fallbacks',
    'layout',
  ];
  const points: Record<string, string> = Object.create(null);
  const exposures = new Set<string>();

  for (const { modulePath } of collectRoutemapModulePaths(
    manifest,
    routemapPath,
    serverTypes
  )) {
    addEntryPoint(points, exposures, modulePath, root, true);
  }

  return { points, exposures };
}

export interface ResolveClientEntryPointsOptions {
  dynamicImportPredicate?: DynamicImportPredicate;
  searchDirs?: string[];
  ignore?: string[];
  /**
   * Shared caches for route asset collection. When provided, `readFile`,
   * `es-module-lexer.parse` results are memoized across `resolveClientEntryPoints`
   * and subsequent SSR `@web-widget:export-meta` transform calls sharing the
   * same cache instance — critical for builds with many routes that share
   * common dependencies. The `resolved` cache is resolver-scoped and will be
   * repopulated by SSR transform's `this.resolve`.
   */
  caches?: RouteAssetCaches;
}

export async function resolveClientEntryPoints(
  manifest: RouteMap,
  routemapPath: string,
  root: string,
  options: ResolveClientEntryPointsOptions
): Promise<BuildEntryPoints> {
  const points: Record<string, string> = Object.create(null);
  const exposures = new Set<string>();
  const seenModules = new Set<string>();

  const addUniqueModule = (modulePath: string, expose: boolean) => {
    const normalized = path.normalize(modulePath);
    if (seenModules.has(normalized)) {
      return;
    }
    addEntryPoint(points, exposures, normalized, root, expose);
    seenModules.add(normalized);
  };

  const searchDirs = options.searchDirs ?? ['.'];
  const ignore = options.ignore ?? [];

  // Collect CSS and widget modules from each route's import graph so that
  // only CSS actually referenced by a route becomes a client build entry
  // (async chunk CSS that is only dynamically imported is excluded).
  const routeModules = collectRoutemapModulePaths(manifest, routemapPath, [
    'routes',
    'fallbacks',
  ]);
  const caches = createRouteAssetCaches();

  for (const { modulePath } of routeModules) {
    const assets = await collectRouteModuleAssets(modulePath, {
      root,
      dynamicImportPredicate: options.dynamicImportPredicate,
      caches,
    });

    for (const cssModule of assets.cssModules) {
      addUniqueModule(path.resolve(root, cssModule), false);
    }
    for (const widgetModule of assets.widgetModules) {
      addUniqueModule(path.resolve(root, widgetModule), false);
    }
  }

  // Register widgets discovered on disk as client build entries.
  for (const widgetModule of await discoverWidgetModulePaths(
    root,
    searchDirs,
    ignore,
    options.dynamicImportPredicate
  )) {
    addUniqueModule(path.resolve(root, widgetModule), false);
  }

  // Register actions as exposed entries.
  for (const { modulePath } of collectRoutemapModulePaths(
    manifest,
    routemapPath,
    ['actions']
  )) {
    addUniqueModule(modulePath, true);
  }

  return { points, exposures };
}
