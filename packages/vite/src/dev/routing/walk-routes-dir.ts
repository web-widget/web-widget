import fs from "node:fs";
import { join } from "node:path";
import type { RouteSourceFile } from "./types";
import { normalizePath } from "./fs";
import { getSourceFile } from "./source-file";

export async function walkRoutes(
  routesDir: string,
  exclude: string[] = ["node_modules"]
) {
  const sourceFiles: RouteSourceFile[] = [];
  await walkRouteDir(sourceFiles, exclude, normalizePath(routesDir));
  return sourceFiles.sort((a, b) => a.path.localeCompare(b.path, "en"));
}

async function walkRouteDir(
  sourceFiles: RouteSourceFile[],
  exclude: string[],
  dir: string
) {
  const dirItemNames = await fs.promises.readdir(dir);

  await Promise.all(
    dirItemNames
      .filter((itemName) => !exclude.includes(itemName))
      .map(async (itemName) => {
        let stat;
        const path = normalizePath(join(dir, itemName));

        try {
          stat = await fs.promises.stat(path);
        } catch (e) {
          return;
        }

        if (stat.isDirectory()) {
          await walkRouteDir(sourceFiles, exclude, path);
        } else {
          const sourceFileName = getSourceFile(itemName);
          if (sourceFileName !== null) {
            sourceFiles.push({
              ...sourceFileName,
              base: itemName,
              path,
              dir,
            });
          }
        }
      })
  );
}
