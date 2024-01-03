import path from "node:path";
import fs from "node:fs/promises";
import { walkRoutes } from "./walk-routes-dir";
import { pathToPattern, sortRoutePaths } from "./extract";
import type { ManifestJSON } from "@web-widget/web-router";
import { createFileId, getPathnameFromDirPath, normalizePath } from "./fs";

export async function rewriteRoutemap(
  file: string,
  routesDir: string,
  root: string,
  basePathname: string,
  trailingSlash: boolean
) {
  const toModule = (module: string) =>
    normalizePath(path.relative(root, module));
  const toPathname = (dir: string, name: string) =>
    pathToPattern(
      getPathnameFromDirPath(
        path.join(path.relative(routesDir, dir), name),
        basePathname,
        trailingSlash
      ).slice(1)
    );

  const sourceFiles = await walkRoutes(routesDir);
  const fallbacks = sourceFiles.filter((s) => s.type === "fallback");
  const layouts = sourceFiles.filter((s) => s.type === "layout");
  const middlewares = sourceFiles.filter((s) => s.type === "middleware");
  const routes = sourceFiles.filter((s) => s.type === "route");

  const routemap: ManifestJSON = {
    routes: routes
      .map((item) => ({
        name: createFileId(routesDir, `${item.dir}/${item.name}`, "Route"),
        pathname: toPathname(item.dir, item.name),
        module: toModule(item.path),
      }))
      .sort((a, b) => sortRoutePaths(a.pathname, b.pathname)),

    middlewares: middlewares
      .map((item) => ({
        name: createFileId(routesDir, `${item.dir}/${item.name}`, "Middleware"),
        pathname: toPathname(item.dir, item.name),
        module: toModule(item.path),
      }))
      .sort((a, b) => sortRoutePaths(a.pathname, b.pathname)),

    fallbacks: fallbacks.map((item) => ({
      name: createFileId(routesDir, `${item.dir}/${item.name}`, "Fallback"),
      status: parseInt(item.name.slice(1)),
      pathname: toPathname(item.dir, item.name),
      module: toModule(item.path),
    })),

    layout: layouts[0]
      ? ((item) => ({
          name: createFileId(routesDir, `${item.dir}/${item.name}`, "Layout"),
          module: toModule(item.path),
        }))(layouts[0])
      : undefined,
  };

  await fs.writeFile(file, JSON.stringify(routemap, null, 2), "utf8");
}
