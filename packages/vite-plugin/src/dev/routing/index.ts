import fs from 'node:fs/promises';
import path from 'node:path';
import type { FSWatcher } from 'vite';
import { walkRoutes } from './walk-routes-dir';
import { pathToPattern, sortRoutePaths } from './extract';
import type { RouteSourceFile, OverridePathname } from './types';
import type { RouteMap } from '@/types';
import {
  isPathPrefix,
  normalizePath,
  relativePathWithDot,
} from '@/internal/path';

export interface FileSystemRouteGeneratorOptions {
  basePathname: string;
  root: string;
  routemapPath: string;
  routesPath: string;
  overridePathname?: OverridePathname;
  onRoutemapUpdated?: () => void | Promise<void>;
  watcher: FSWatcher;
}

export async function fileSystemRouteGenerator({
  basePathname,
  root,
  routemapPath,
  routesPath,
  overridePathname,
  onRoutemapUpdated,
  watcher,
}: FileSystemRouteGeneratorOptions) {
  const cache = {};
  const absoluteRoutesPath = path.resolve(root, routesPath);
  await generateRoutemapFile(
    root,
    absoluteRoutesPath,
    basePathname,
    overridePathname,
    routemapPath,
    cache,
    onRoutemapUpdated
  ).catch((error) => logRoutemapError(error));
  const updateFileSystemRouteing = debounce(() => {
    void generateRoutemapFile(
      root,
      absoluteRoutesPath,
      basePathname,
      overridePathname,
      routemapPath,
      cache,
      onRoutemapUpdated
    ).catch((error) => logRoutemapError(error));
  }, 40);
  watcher.on('all', (event, filePath) => {
    if (isPathPrefix(absoluteRoutesPath, filePath) && event !== 'change') {
      updateFileSystemRouteing();
    }
  });
}

function debounce<Params extends any[]>(
  func: (...args: Params) => any,
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

async function generateRoutemapFile(
  root: string,
  routesPath: string,
  basePathname: string,
  overridePathname: OverridePathname | undefined,
  routemapPath: string,
  cache: any,
  onRoutemapUpdated?: () => void | Promise<void>
) {
  const key = Symbol.for('routemap');
  const routemap = await getRoutemap(
    root,
    routesPath,
    basePathname,
    overridePathname
  );
  const newJson = JSON.stringify(routemap, null, 2);

  if (newJson !== cache[key]) {
    await fs.writeFile(routemapPath, JSON.stringify(routemap, null, 2), 'utf8');
    cache[key] = newJson;
    try {
      await onRoutemapUpdated?.();
    } catch (error) {
      logRoutemapError(error);
    }
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

export async function getRoutemap(
  root: string,
  routesPath: string,
  basePathname: string,
  overridePathname: OverridePathname | undefined
): Promise<RouteMap> {
  const sourceFiles = await walkRoutes(routesPath);
  const fallbacks = sourceFiles.filter((s) => s.type === 'fallback');
  const layouts = sourceFiles.filter((s) => s.type === 'layout');
  const middlewares = sourceFiles.filter((s) => s.type === 'middleware');
  const routes = sourceFiles.filter((s) => s.type === 'route');
  const actions = sourceFiles.filter((s) => s.type === 'action');

  const routeTypeLike = ['route', 'middleware', 'action'];
  const toValue = (source: RouteSourceFile) => {
    let pathname;

    if (routeTypeLike.includes(source.type)) {
      pathname = normalizePath(basePathname + source.pathname);

      if (pathname.startsWith('/')) {
        pathname = pathname.substring(1);
      }

      pathname = pathToPattern(pathname);
      if (overridePathname) {
        pathname = overridePathname(pathname, source);
      }
    }

    //const name = createFileId(pathname ?? source.name, source.type);
    const module = relativePathWithDot(root, source.source);
    const status =
      source.type === 'fallback'
        ? parseInt(source.name.replaceAll(/\D/g, ''))
        : undefined;

    return {
      pathname,
      //name,
      module,
      status,
    };
  };

  return {
    routes: routes
      .map(toValue)
      .sort((a, b) =>
        sortRoutePaths(a.pathname!, b.pathname!)
      ) as RouteMap['routes'],
    actions: actions
      .map(toValue)
      .sort((a, b) =>
        sortRoutePaths(a.pathname!, b.pathname!)
      ) as RouteMap['actions'],
    middlewares: middlewares
      .map(toValue)
      .sort((a, b) =>
        sortRoutePaths(a.pathname!, b.pathname!)
      ) as RouteMap['middlewares'],
    fallbacks: fallbacks.map(toValue) as RouteMap['fallbacks'],
    layout: (layouts[0]
      ? toValue(layouts[0])
      : undefined) as RouteMap['layout'],
  };
}
