import fs from 'node:fs/promises';
import path from 'node:path';
import { getRoutemap } from '@/internal/routemap-from-fs';
import type { ResolvedWebRouterConfig } from '@/types';
import { defaultFileExistsSync, type FileExistsSync } from './io';

export const EMPTY_IMPORTMAP = {
  imports: {},
  scopes: {},
} as const;

export function resolveLogicalConfigPath(
  root: string,
  fileName: string
): string {
  return path.isAbsolute(fileName) ? fileName : path.resolve(root, fileName);
}

export function formatMissingEntryError(
  label: string,
  fileName: string,
  attemptedPaths: string[]
): string {
  const example =
    label === 'entry.server'
      ? [
          `  import WebRouter from '@web-widget/web-router';`,
          `  const { meta, manifest } = import.meta.framework;`,
          `  export default WebRouter.fromManifest(manifest, { defaultMeta: meta });`,
        ].join('\n')
      : `  import '@web-widget/web-widget';`;

  return (
    `Missing ${label}.\n\n` +
    `Create ${fileName}.ts (or .tsx) in the project root. Example:\n\n${example}\n\n` +
    `Searched: ${attemptedPaths.join(', ')}`
  );
}

export function requireConventionEntry(
  label: 'entry.client' | 'entry.server',
  fileName: string,
  root: string,
  extensions: string[],
  fileExists: FileExistsSync = defaultFileExistsSync
): string {
  const attemptedPaths = ['', ...extensions].map((extension) =>
    path.resolve(root, `${fileName}${extension}`)
  );

  for (const filePath of attemptedPaths) {
    if (fileExists(filePath)) {
      return filePath;
    }
  }

  throw new Error(formatMissingEntryError(label, fileName, attemptedPaths));
}

export interface EnsureConventionFilesOptions {
  config: ResolvedWebRouterConfig;
  root: string;
  fileExists?: FileExistsSync;
  writeFile?: (filePath: string, data: string) => Promise<void>;
  mkdir?: (dir: string) => Promise<void>;
}

export async function ensureConventionFiles(
  options: EnsureConventionFilesOptions
): Promise<void> {
  const {
    config,
    root,
    fileExists = defaultFileExistsSync,
    writeFile = (filePath, data) => fs.writeFile(filePath, data, 'utf-8'),
    mkdir = async (dir) => {
      await fs.mkdir(dir, { recursive: true });
    },
  } = options;

  await ensureImportmapFile(config, fileExists, writeFile);
  await ensureRoutemapFile(config, root, fileExists, writeFile, mkdir);
}

async function ensureImportmapFile(
  config: ResolvedWebRouterConfig,
  fileExists: FileExistsSync,
  writeFile: (filePath: string, data: string) => Promise<void>
): Promise<void> {
  const importmapPath = config.input.client.importmap;

  if (fileExists(importmapPath)) {
    return;
  }

  await writeFile(
    importmapPath,
    `${JSON.stringify(EMPTY_IMPORTMAP, null, 2)}\n`
  );
}

async function ensureRoutemapFile(
  config: ResolvedWebRouterConfig,
  root: string,
  fileExists: FileExistsSync,
  writeFile: (filePath: string, data: string) => Promise<void>,
  mkdir: (dir: string) => Promise<void>
): Promise<void> {
  const routemapPath = config.input.server.routemap;

  if (fileExists(routemapPath)) {
    return;
  }

  if (config.filesystemRouting.enabled) {
    const routesPath = config.filesystemRouting.dir;
    if (!fileExists(routesPath)) {
      await mkdir(routesPath);
    }

    const routemap = await getRoutemap(
      root,
      routesPath,
      config.filesystemRouting.basePathname,
      config.filesystemRouting.overridePathname
    );
    await writeFile(routemapPath, `${JSON.stringify(routemap, null, 2)}\n`);
    return;
  }

  throw new Error(formatMissingRoutemapError(routemapPath));
}

export function formatMissingRoutemapError(routemapPath: string): string {
  return (
    `Missing routemap at ${routemapPath}.\n\n` +
    `Create routemap.server.json with your routes, or enable filesystem routing:\n\n` +
    `  webRouterPlugin({ filesystemRouting: { enabled: true } })`
  );
}
