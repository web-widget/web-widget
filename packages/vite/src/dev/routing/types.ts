export interface RouteSourceFile extends RouteSourceFileName {
  pathname: string;
  source: string;
}

export interface RouteSourceFileName {
  name: string;
  type: RouteSourceType;
  ext: string;
}

export type RouteSourceType = "route" | "fallback" | "layout" | "middleware";
