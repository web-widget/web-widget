import path from 'node:path';
import fs from 'node:fs/promises';
import type { Manifest, PluginOption, ResolvedConfig } from 'vite';

import type { ResolvedWebRouterConfig, WebRouterPlugin } from '@/types';

export function getWebRouterPluginApi(
  config:
    | Pick<ResolvedConfig, 'plugins'>
    | { plugins?: readonly PluginOption[] }
) {
  for (const plugin of config.plugins ?? []) {
    if (
      plugin &&
      typeof plugin === 'object' &&
      !Array.isArray(plugin) &&
      'name' in plugin &&
      plugin.name === '@web-widget:router'
    ) {
      return (plugin as WebRouterPlugin).api;
    }
  }

  return undefined;
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
