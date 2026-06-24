import { walkRoutes } from '@/dev/routing/walk-routes-dir';
import { pathToPattern, sortRoutePaths } from '@/dev/routing/extract';
import type { OverridePathname, RouteSourceFile } from '@/dev/routing/types';
import type { RouteMap } from '@/types';
import { normalizePath, relativePathWithDot } from '@/internal/path';

const ROUTE_TYPE_LIKE = new Set(['route', 'middleware', 'action']);

function toRouteMapValue(
  root: string,
  basePathname: string,
  overridePathname: OverridePathname | undefined,
  source: RouteSourceFile
) {
  let pathname: string | undefined;

  if (ROUTE_TYPE_LIKE.has(source.type)) {
    pathname = normalizePath(basePathname + source.pathname);

    if (pathname.startsWith('/')) {
      pathname = pathname.substring(1);
    }

    pathname = pathToPattern(pathname);
    if (overridePathname) {
      pathname = overridePathname(pathname, source);
    }
  }

  const module = relativePathWithDot(root, source.source);
  const status =
    source.type === 'fallback'
      ? parseInt(source.name.replaceAll(/\D/g, ''), 10)
      : undefined;

  return {
    pathname,
    module,
    status,
  };
}

export async function getRoutemap(
  root: string,
  routesPath: string,
  basePathname: string,
  overridePathname: OverridePathname | undefined
): Promise<RouteMap> {
  const sourceFiles = await walkRoutes(routesPath);
  const fallbacks: RouteSourceFile[] = [];
  const layouts: RouteSourceFile[] = [];
  const middlewares: RouteSourceFile[] = [];
  const routes: RouteSourceFile[] = [];
  const actions: RouteSourceFile[] = [];

  for (const source of sourceFiles) {
    switch (source.type) {
      case 'fallback':
        fallbacks.push(source);
        break;
      case 'layout':
        layouts.push(source);
        break;
      case 'middleware':
        middlewares.push(source);
        break;
      case 'route':
        routes.push(source);
        break;
      case 'action':
        actions.push(source);
        break;
    }
  }

  const toValue = (source: RouteSourceFile) =>
    toRouteMapValue(root, basePathname, overridePathname, source);

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
