import path from "node:path";
import fs from "node:fs/promises";
import { walkRoutes } from "./walk-routes-dir";
import { pathToPattern, sortRoutePaths } from "./extract";
import type { ManifestJSON } from "@web-widget/web-router";
import { /*createFileId,*/ getPathnameFromDirPath, normalizePath } from "./fs";
import type { RouteSourceFile } from "./types";

export async function rewriteRoutemap(
  file: string,
  routesDir: string,
  root: string,
  basePathname: string,
  trailingSlash: boolean
) {
  const sourceFiles = await walkRoutes(routesDir);
  const fallbacks = sourceFiles.filter((s) => s.type === "fallback");
  const layouts = sourceFiles.filter((s) => s.type === "layout");
  const middlewares = sourceFiles
    .filter((s) => s.type === "middleware")
    .sort((a, b) => sortRoutePaths(a.pathname, b.pathname));
  const routes = sourceFiles
    .filter((s) => s.type === "route")
    .sort((a, b) => sortRoutePaths(a.pathname, b.pathname));

  const toValue = (item: RouteSourceFile) => {
    const pathname =
      item.type === "route" || item.type === "middleware"
        ? pathToPattern(
            getPathnameFromDirPath(
              item.pathname,
              basePathname,
              trailingSlash
            ).slice(1)
          )
        : undefined;
    //const name = createFileId(pathname ?? item.name, item.type);
    const module = normalizePath(path.relative(root, item.source));
    const status =
      item.type === "fallback"
        ? parseInt(item.name.replaceAll(/\D/g, ""))
        : undefined;

    return {
      pathname,
      //name,
      module,
      status,
    };
  };

  const routemap: ManifestJSON = {
    routes: routes.map(toValue) as ManifestJSON["routes"],
    middlewares: middlewares.map(toValue) as ManifestJSON["middlewares"],
    fallbacks: fallbacks.map(toValue) as ManifestJSON["fallbacks"],
    layout: (layouts[0]
      ? toValue(layouts[0])
      : undefined) as ManifestJSON["layout"],
  };

  await fs.writeFile(file, JSON.stringify(routemap, null, 2), "utf8");
}
