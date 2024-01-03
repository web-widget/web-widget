import path from "node:path";
import fs from "node:fs/promises";
import { walkRoutes } from "./walk-routes-dir";
import { resolveSourceFiles } from "./resolve-source-file";
import { pathToPattern } from "./extract";
import type { ManifestJSON } from "@web-widget/web-router";
import { createFileId } from "./fs";

export async function rewriteRoutemap(
  file: string,
  routes: string,
  root: string
) {
  const sourceFiles = (await walkRoutes(routes)).map((item) => {
    return {
      ...item,
      route: pathToPattern(
        path.join(path.relative(routes, item.dir), item.name)
      ),
    };
  });
  const files = resolveSourceFiles(sourceFiles);
  const routemap: ManifestJSON = {
    routes: files.routes.map((item) => ({
      name: createFileId(routes, `${item.dir}/${item.name}`, "Route"),
      pathname: pathToPattern(
        path.join(path.relative(routes, item.dir), item.name)
      ),
      module: path.relative(root, item.path),
    })),
    middlewares: files.middlewares.map((item) => ({
      name: createFileId(routes, `${item.dir}/${item.name}`, "Middleware"),
      pathname: pathToPattern(
        path.join(path.relative(routes, item.dir), item.name)
      ),
      module: path.relative(root, item.path),
    })),
    fallbacks: files.fallbacks.map((item) => ({
      name: createFileId(routes, `${item.dir}/${item.name}`, "Fallback"),
      status: parseInt(item.name.slice(1)),
      pathname: pathToPattern(
        path.join(path.relative(routes, item.dir), item.name)
      ),
      module: path.relative(root, item.path),
    })),
    layout: files.layouts[0]
      ? ((item) => ({
          name: createFileId(routes, `${item.dir}/${item.name}`, "Layout"),
          module: path.relative(root, item.path),
        }))(files.layouts[0])
      : undefined,
  };
  const data = JSON.stringify(routemap, null, 2);
  await fs.writeFile(file, data, "utf8");
}
