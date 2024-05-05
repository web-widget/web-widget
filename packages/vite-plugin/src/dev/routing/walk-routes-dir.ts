import fs from 'node:fs';
import { join, relative } from 'node:path';
import type { RouteSourceFile } from './types';
import { getSourceFile } from './source-file';
import { normalizePath } from '@/utils';

export async function walkRoutes(
  routesDir: string,
  exclude: string[] = ['node_modules']
) {
  const sourceFiles: RouteSourceFile[] = [];
  await walkRouteDir(
    sourceFiles,
    exclude,
    normalizePath(routesDir),
    normalizePath(routesDir)
  );
  return sourceFiles.sort((a, b) => a.pathname.localeCompare(b.pathname, 'en'));
}

async function walkRouteDir(
  sourceFiles: RouteSourceFile[],
  exclude: string[],
  dir: string,
  root: string
) {
  const dirItemNames = await fs.promises.readdir(dir);

  await Promise.all(
    dirItemNames
      .filter((itemName) => !exclude.includes(itemName))
      .map(async (itemName) => {
        let stat;
        const source = normalizePath(join(dir, itemName));

        try {
          stat = await fs.promises.stat(source);
        } catch (e) {
          return;
        }

        if (stat.isDirectory()) {
          await walkRouteDir(sourceFiles, exclude, source, root);
        } else {
          const sourceFileName = getSourceFile(itemName);
          if (sourceFileName !== null) {
            sourceFiles.push({
              ...sourceFileName,
              pathname: join(relative(root, dir), sourceFileName.name),
              source,
            });
          }
        }
      })
  );
}
