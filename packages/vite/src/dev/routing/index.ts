import path from "node:path";
import fs from "node:fs/promises";
import { walkRoutes } from "./walk-routes-dir";
import { pathToPattern, sortRoutePaths } from "./extract";
import type { ManifestJSON } from "@web-widget/web-router";
import { createFileId, getPathnameFromDirPath, normalizePath } from "./fs";
import type { RouteSourceFile } from "./types";

const sortPath = (a: RouteSourceFile, b: RouteSourceFile) =>
  sortRoutePaths(a.path, b.path);
function resolveSourceFiles(sourceFiles: RouteSourceFile[]) {
  const layouts = sourceFiles.filter((s) => s.type === "layout");

  const routes = sourceFiles.filter((s) => s.type === "route").sort(sortPath);

  const middlewares = sourceFiles
    .filter((s) => s.type === "middleware")
    .sort(sortPath);

  const fallbacks = sourceFiles.filter((s) => s.type === "fallback");

  return { layouts, routes, middlewares, fallbacks };
}

export async function rewriteRoutemap(
  file: string,
  routes: string,
  root: string,
  basePathname: string,
  trailingSlash: boolean
) {
  const sourceFiles = await walkRoutes(routes);
  const files = resolveSourceFiles(sourceFiles);
  const routemap: ManifestJSON = {
    routes: files.routes.map((item) => ({
      name: createFileId(routes, `${item.dir}/${item.name}`, "Route"),
      pathname: pathToPattern(
        getPathnameFromDirPath(
          path.join(path.relative(routes, item.dir), item.name),
          basePathname,
          trailingSlash
        ).slice(1)
      ),
      module: normalizePath(path.relative(root, item.path)),
    })),

    middlewares: files.middlewares.map((item) => ({
      name: createFileId(routes, `${item.dir}/${item.name}`, "Middleware"),
      pathname: pathToPattern(
        getPathnameFromDirPath(
          path.join(path.relative(routes, item.dir), item.name),
          basePathname,
          trailingSlash
        ).slice(1)
      ),
      module: normalizePath(path.relative(root, item.path)),
    })),

    fallbacks: files.fallbacks.map((item) => ({
      name: createFileId(routes, `${item.dir}/${item.name}`, "Fallback"),
      status: parseInt(item.name.slice(1)),
      pathname: pathToPattern(
        getPathnameFromDirPath(
          path.join(path.relative(routes, item.dir), item.name),
          basePathname,
          trailingSlash
        ).slice(1)
      ),
      module: normalizePath(path.relative(root, item.path)),
    })),

    layout: files.layouts[0]
      ? ((item) => ({
          name: createFileId(routes, `${item.dir}/${item.name}`, "Layout"),
          module: normalizePath(path.relative(root, item.path)),
        }))(files.layouts[0])
      : undefined,
  };
  const data = JSON.stringify(routemap, null, 2);
  await fs.writeFile(file, data, "utf8");
}
