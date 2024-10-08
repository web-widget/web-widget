import fs from 'node:fs/promises';
import type { FSWatcher } from 'vite';
import { walkRoutes } from './walk-routes-dir';
import { pathToPattern, sortRoutePaths } from './extract';
import type { RouteSourceFile, OverridePathname } from './types';
import type { RouteMap } from '@/types';
import { relativePathWithDot, normalizePath } from '@/utils';

export interface FileSystemRouteGeneratorOptions {
  basePathname: string;
  root: string;
  routemapPath: string;
  routesPath: string;
  overridePathname?: OverridePathname;
  update: (padding: Promise<void>) => void;
  watcher: FSWatcher;
}

export async function fileSystemRouteGenerator({
  basePathname,
  root,
  routemapPath,
  routesPath,
  overridePathname,
  update,
  watcher,
}: FileSystemRouteGeneratorOptions) {
  const cache = {};
  await generateRoutemapFile(
    root,
    routesPath,
    basePathname,
    overridePathname,
    routemapPath,
    cache
  );
  const updateFileSystemRouteing = debounce(() => {
    update(
      generateRoutemapFile(
        root,
        routesPath,
        basePathname,
        overridePathname,
        routemapPath,
        cache
      )
    );
  }, 40);
  watcher.on('all', (event, path) => {
    if (path.startsWith(routesPath) && event !== 'change') {
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
  cache: any
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
  const middlewares = sourceFiles
    .filter((s) => s.type === 'middleware')
    .sort((a, b) => sortRoutePaths(a.pathname, b.pathname));
  const routes = sourceFiles
    .filter((s) => s.type === 'route')
    .sort((a, b) => sortRoutePaths(a.pathname, b.pathname));
  const actions = sourceFiles
    .filter((s) => s.type === 'action')
    .sort((a, b) => sortRoutePaths(a.pathname, b.pathname));

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
    routes: routes.map(toValue) as RouteMap['routes'],
    actions: actions.map(toValue) as RouteMap['actions'],
    middlewares: middlewares.map(toValue) as RouteMap['middlewares'],
    fallbacks: fallbacks.map(toValue) as RouteMap['fallbacks'],
    layout: (layouts[0]
      ? toValue(layouts[0])
      : undefined) as RouteMap['layout'],
  };
}
