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

export type OverridePathname = (
  pathname: string,
  source: RouteSourceFile
) => string;
