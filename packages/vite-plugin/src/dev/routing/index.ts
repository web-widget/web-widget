import fs from 'node:fs/promises';
import type { FSWatcher } from 'vite';
import { walkRoutes } from './walk-routes-dir';
import { pathToPattern, sortRoutePaths } from './extract';
import type { RouteSourceFile, Override, RoutePattern } from './types';
import type { RouteMap } from '@/types';
import { relativePathWithDot, normalizePath } from '@/utils';

export interface FileSystemRouteGeneratorOptions {
  basePathname: string;
  root: string;
  routemapPath: string;
  routesPath: string;
  override?: Override;
  update: (padding: Promise<void>) => void;
  watcher: FSWatcher;
}

export async function fileSystemRouteGenerator({
  basePathname,
  root,
  routemapPath,
  routesPath,
  override,
  update,
  watcher,
}: FileSystemRouteGeneratorOptions) {
  const cache = {};
  await generateRoutemapFile(
    root,
    routesPath,
    basePathname,
    override,
    routemapPath,
    cache
  );
  const updateFileSystemRouteing = debounce(() => {
    update(
      generateRoutemapFile(
        root,
        routesPath,
        basePathname,
        override,
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
  override: Override | undefined,
  routemapPath: string,
  cache: any
) {
  const key = Symbol.for('routemap');
  const routemap = await getRoutemap(root, routesPath, basePathname, override);
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
  override: Override | undefined
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
  const normalize = (source: RouteSourceFile) => {
    const route: RoutePattern = {};

    if (routeTypeLike.includes(source.type)) {
      route.pathname = normalizePath(basePathname + source.pathname);

      if (route.pathname.startsWith('/')) {
        route.pathname = route.pathname.substring(1);
      }

      route.pathname = pathToPattern(route.pathname);
      if (override) {
        Object.assign(route, override(route, source));
      }
    }

    //const name = createFileId(pathname ?? source.name, source.type);
    const module = relativePathWithDot(root, source.source);
    const status =
      source.type === 'fallback'
        ? parseInt(source.name.replaceAll(/\D/g, ''))
        : undefined;

    return {
      ...route,
      //name,
      module,
      status,
    };
  };

  return {
    routes: routes.map(normalize) as RouteMap['routes'],
    actions: actions.map(normalize) as RouteMap['actions'],
    middlewares: middlewares.map(normalize) as RouteMap['middlewares'],
    fallbacks: fallbacks.map(normalize) as RouteMap['fallbacks'],
    layout: (layouts[0]
      ? normalize(layouts[0])
      : undefined) as RouteMap['layout'],
  };
}
