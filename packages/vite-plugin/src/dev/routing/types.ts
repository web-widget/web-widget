import type { RoutePattern } from '@web-widget/web-router';

export interface RouteSourceFile extends RouteSourceFileName {
  pathname: string;
  source: string;
}

export interface RouteSourceFileName {
  name: string;
  type: RouteSourceType;
  ext: string;
}

export type RouteSourceType =
  | 'action'
  | 'fallback'
  | 'layout'
  | 'middleware'
  | 'route';

export { RoutePattern };

export type Rewrite = (
  route: RoutePattern,
  source: RouteSourceFile
) => RoutePattern;
