import path from 'node:path';
import type { RouteMap } from '@/types';
import { normalizePath } from '@/internal/path';
import {
  collectRouteModuleAssets,
  defaultWidgetPathMatcher,
  discoverWidgetModulePaths,
  type CollectRouteAssetsOptions,
  type RouteClientAssetsIndex,
} from './collect-route-assets';

export type BuildEntryPoints = {
  points: Record<string, string>;
  exposures: Set<string>;
};

export function entryNameFromModulePath(
  modulePath: string,
  root: string
): string {
  return normalizePath(
    path
      .relative(
        root,
        modulePath.slice(0, modulePath.length - path.extname(modulePath).length)
      )
      .replace(/^(routes|pages|src|app)[/\\]/g, '')
      .split(path.sep)
      .join('.')
      .replace(/[^a-zA-Z0-9@_.-]+/g, '_')
  );
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

function collectRoutemapModulePaths(
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

export async function resolveClientEntryPoints(
  manifest: RouteMap,
  routemapPath: string,
  root: string,
  collectOptions: Omit<CollectRouteAssetsOptions, 'root'> & {
    widgetSearchDirs?: string[];
  }
): Promise<{
  entryPoints: BuildEntryPoints;
  routeClientAssets: RouteClientAssetsIndex;
}> {
  const points: Record<string, string> = Object.create(null);
  const exposures = new Set<string>();
  const routeClientAssets: RouteClientAssetsIndex = new Map();
  const seenModules = new Map<string, string>();

  const addUniqueModule = (modulePath: string, expose: boolean) => {
    const normalized = path.normalize(modulePath);
    if (seenModules.has(normalized)) {
      return;
    }
    addEntryPoint(points, exposures, normalized, root, expose);
    seenModules.set(normalized, normalized);
  };

  const assetOptions: CollectRouteAssetsOptions = {
    root,
    ...collectOptions,
    isWidget: collectOptions.isWidget ?? defaultWidgetPathMatcher,
  };

  const routeModules = collectRoutemapModulePaths(manifest, routemapPath, [
    'routes',
    'fallbacks',
  ]);

  for (const { modulePath } of routeModules) {
    const relativeKey = normalizePath(path.relative(root, modulePath));
    const assets = await collectRouteModuleAssets(modulePath, assetOptions);
    routeClientAssets.set(relativeKey, assets);

    for (const cssModule of assets.cssModules) {
      addUniqueModule(path.resolve(root, cssModule), false);
    }
    for (const widgetModule of assets.widgetModules) {
      addUniqueModule(path.resolve(root, widgetModule), false);
    }
  }

  for (const { modulePath } of collectRoutemapModulePaths(
    manifest,
    routemapPath,
    ['actions']
  )) {
    addUniqueModule(modulePath, true);
  }

  const widgetSearchDirs = collectOptions.widgetSearchDirs ?? ['routes'];
  for (const widgetModule of await discoverWidgetModulePaths(
    root,
    widgetSearchDirs
  )) {
    addUniqueModule(path.resolve(root, widgetModule), false);
  }

  return {
    entryPoints: { points, exposures },
    routeClientAssets,
  };
}
