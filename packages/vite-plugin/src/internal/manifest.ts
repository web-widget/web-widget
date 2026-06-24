import path from 'node:path';
import fs from 'node:fs/promises';
import type { Manifest, ResolvedConfig } from 'vite';

import type { ResolvedWebRouterConfig, WebRouterPlugin } from '@/types';

export function getWebRouterPluginApi(config: ResolvedConfig) {
  const webRouterPlugin = config.plugins.find(
    (p) => p.name === '@web-widget:router'
  ) as WebRouterPlugin | undefined;

  return webRouterPlugin?.api;
}

export async function getManifest(
  root: string,
  { output: { dir, client, manifest } }: ResolvedWebRouterConfig
) {
  const manifestPath = path.join(root, dir, client, manifest);
  const fileContent = await fs.readFile(manifestPath, 'utf-8');
  const viteManifest = JSON.parse(fileContent) as Manifest;

  return viteManifest;
}
