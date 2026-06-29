import fs from 'node:fs/promises';
import path from 'node:path';
import type { FSWatcher } from 'vite';
import { getRoutemap } from '@/internal/routemap-from-fs';
import type { RouteMap } from '@/types';
import { isPathPrefix } from '@/internal/path';
import { isStructuralRoutemapChange } from './routemap-diff';
import { shouldApplyRoutemapUpdate } from './routemap-update';
import type { OverridePathname } from './types';

export { getRoutemap } from '@/internal/routemap-from-fs';

export interface RoutemapChange {
  previous?: RouteMap;
  next: RouteMap;
  structural: boolean;
  /** Filesystem routing files changed since the last applied update. */
  filesystemChanged: boolean;
}

export interface FileSystemRouteGeneratorOptions {
  basePathname: string;
  root: string;
  routemapPath: string;
  routesPath: string;
  overridePathname?: OverridePathname;
  onRoutemapComputed?: (routemap: RouteMap) => void;
  onRoutemapChanged?: (change: RoutemapChange) => void | Promise<void>;
  watcher: FSWatcher;
  ignore?: string[];
}

interface RoutemapFileCache {
  json?: string;
  routemap?: RouteMap;
}

export async function fileSystemRouteGenerator({
  basePathname,
  root,
  routemapPath,
  routesPath,
  overridePathname,
  onRoutemapComputed,
  onRoutemapChanged,
  watcher,
  ignore,
}: FileSystemRouteGeneratorOptions) {
  const cache: RoutemapFileCache = {};
  let filesystemDirty = false;
  let routemapUpdateQueue: Promise<void> = Promise.resolve();
  const absoluteRoutesPath = path.resolve(root, routesPath);

  const enqueueRoutemapUpdate = (
    options: Omit<
      Parameters<typeof updateRoutemapFile>[0],
      'cache' | 'onRoutemapComputed' | 'onRoutemapChanged'
    >
  ) => {
    routemapUpdateQueue = routemapUpdateQueue
      .then(() =>
        updateRoutemapFile({
          ...options,
          cache,
          onRoutemapComputed,
          onRoutemapChanged,
        })
      )
      .catch((error) => {
        logRoutemapError(error);
      });
    return routemapUpdateQueue;
  };

  await enqueueRoutemapUpdate({
    root,
    absoluteRoutesPath,
    basePathname,
    overridePathname,
    routemapPath,
    filesystemDirty: false,
    ignore,
  });

  const updateFileSystemRouting = debounce(() => {
    const dirty = filesystemDirty;
    filesystemDirty = false;
    enqueueRoutemapUpdate({
      root,
      absoluteRoutesPath,
      basePathname,
      overridePathname,
      routemapPath,
      filesystemDirty: dirty,
      ignore,
    });
  }, 40);

  watcher.on('all', (event, filePath) => {
    if (isPathPrefix(absoluteRoutesPath, filePath) && event !== 'change') {
      filesystemDirty = true;
      updateFileSystemRouting();
    }
  });
}

function debounce<Params extends unknown[]>(
  func: (...args: Params) => void,
  timeout: number
): (...args: Params) => void {
  let timer: NodeJS.Timeout;
  return (...args: Params) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, timeout);
  };
}

async function updateRoutemapFile(options: {
  root: string;
  absoluteRoutesPath: string;
  basePathname: string;
  overridePathname: OverridePathname | undefined;
  routemapPath: string;
  cache: RoutemapFileCache;
  filesystemDirty: boolean;
  ignore?: string[];
  onRoutemapComputed?: (routemap: RouteMap) => void;
  onRoutemapChanged?: (change: RoutemapChange) => void | Promise<void>;
}) {
  const {
    root,
    absoluteRoutesPath,
    basePathname,
    overridePathname,
    routemapPath,
    cache,
    filesystemDirty,
    ignore,
    onRoutemapComputed,
    onRoutemapChanged,
  } = options;

  const routemap = await getRoutemap(
    root,
    absoluteRoutesPath,
    basePathname,
    overridePathname,
    ignore
  );
  onRoutemapComputed?.(routemap);

  const newJson = `${JSON.stringify(routemap, null, 2)}\n`;
  if (!shouldApplyRoutemapUpdate(newJson, cache.json, filesystemDirty)) {
    return;
  }

  const previous = cache.routemap;
  const jsonChanged = newJson !== cache.json;
  cache.json = newJson;
  cache.routemap = routemap;

  if (jsonChanged) {
    void fs.writeFile(routemapPath, newJson, 'utf8').catch((error) => {
      logRoutemapError(error);
    });
  }

  const structural = isStructuralRoutemapChange(previous, routemap);
  try {
    await onRoutemapChanged?.({
      previous,
      next: routemap,
      structural,
      filesystemChanged: filesystemDirty,
    });
  } catch (error) {
    logRoutemapError(error);
  }
}

function logRoutemapError(error: unknown) {
  const prefix = '🚧 @web-widget/vite-plugin routemap update failed:';
  if (error instanceof Error) {
    console.error(`${prefix} ${error.stack}`);
  } else {
    console.error(prefix, error);
  }
}
