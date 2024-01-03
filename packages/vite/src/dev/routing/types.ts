export interface RouteSourceFile extends RouteSourceFileName {
  dir: string;
  path: string;
  base: string;
}

export interface RouteSourceFileName {
  name: string;
  type: RouteSourceType;
  ext: string;
}

export type RouteSourceType = "route" | "fallback" | "layout" | "middleware";
