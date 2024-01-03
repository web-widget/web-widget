import { sortRoutePaths } from "./extract";
import type { RouteSourceFile } from "./types";

const sortPath = (a: RouteSourceFile, b: RouteSourceFile) =>
  sortRoutePaths(a.path, b.path);
export function resolveSourceFiles(sourceFiles: RouteSourceFile[]) {
  const layouts = sourceFiles.filter((s) => s.type === "layout");

  const routes = sourceFiles.filter((s) => s.type === "route").sort(sortPath);

  const middlewares = sourceFiles
    .filter((s) => s.type === "middleware")
    .sort(sortPath);

  const fallbacks = sourceFiles.filter((s) => s.type === "fallback");

  return { layouts, routes, middlewares, fallbacks };
}
