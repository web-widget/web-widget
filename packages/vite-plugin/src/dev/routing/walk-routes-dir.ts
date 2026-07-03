import fs from 'node:fs';
import { join, relative } from 'node:path';
import type { RouteSourceFile } from './types';
import { getSourceFile } from './source-file';
import { normalizePath } from '@/internal/path';

export async function walkRoutes(routesDir: string, ignore: string[] = []) {
  const sourceFiles: RouteSourceFile[] = [];
  const ignored = new Set(ignore);
  await walkRouteDir(
    sourceFiles,
    ignored,
    normalizePath(routesDir),
    normalizePath(routesDir)
  );
  return sourceFiles.sort((a, b) => a.pathname.localeCompare(b.pathname, 'en'));
}

async function walkRouteDir(
  sourceFiles: RouteSourceFile[],
  ignore: Set<string>,
  dir: string,
  root: string
) {
  const dirItemNames = await fs.promises.readdir(dir);

  await Promise.all(
    dirItemNames
      .filter((itemName) => !ignore.has(itemName))
      .map(async (itemName) => {
        let stat;
        const source = normalizePath(join(dir, itemName));

        try {
          stat = await fs.promises.stat(source);
        } catch (e) {
          return;
        }

        if (stat.isDirectory()) {
          await walkRouteDir(sourceFiles, ignore, source, root);
        } else {
          const sourceFileName = getSourceFile(itemName);
          if (sourceFileName !== null) {
            sourceFiles.push({
              ...sourceFileName,
              pathname: normalizePath(
                join(relative(root, dir), sourceFileName.name)
              ),
              source,
            });
          }
        }
      })
  );
}
