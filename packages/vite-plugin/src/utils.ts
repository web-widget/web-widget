import path from 'node:path';
import fs from 'node:fs/promises';
import type { Manifest, ResolvedConfig, Manifest as ViteManifest } from 'vite';
import { normalizePath } from 'vite';
import type { LinkDescriptor } from '@web-widget/helpers';
import mime from 'mime-types';
import { WEB_ROUTER_PLUGIN_NAME } from './constants';
import type { ResolvedWebRouterConfig, WebRouterPlugin } from './types';

export { normalizePath };

export function relativePathWithDot(from: string, to: string): string {
  let relativePath = normalizePath(path.relative(from, to));
  if (!relativePath.startsWith('./') && !relativePath.startsWith('../')) {
    return './' + relativePath;
  }
  return relativePath;
}

export function getWebRouterPluginApi(config: ResolvedConfig) {
  const webRouterPlugin = config.plugins.find(
    (p) => p.name === WEB_ROUTER_PLUGIN_NAME
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

export function getLinks(
  manifest: ViteManifest,
  srcFileName: string,
  base: string,
  containSelf: boolean = false,
  cache = new Set(),
  fetchpriority: 'low' | 'high' | 'auto' = 'auto'
): LinkDescriptor[] {
  if (cache.has(srcFileName)) {
    return [];
  }

  cache.add(srcFileName);

  const links: LinkDescriptor[] = [];
  const item = manifest[srcFileName];

  if (!item) {
    return [];
  }

  const push = (srcFileName: string) => {
    const ld = getLink(srcFileName, base, fetchpriority);
    if (ld && !cache.has(ld.href)) {
      links.push(ld);
      cache.add(ld.href);
    }
  };

  if (containSelf) {
    push(item.file);
  }

  if (Array.isArray(item.assets)) {
    item.assets.forEach(push);
  }

  if (Array.isArray(item.css)) {
    item.css.forEach(push);
  }

  if (Array.isArray(item.imports)) {
    item.imports?.forEach((srcFileName) => {
      links.push(
        ...getLinks(manifest, srcFileName, base, true, cache)
          // Note: In the web router, all client components are loaded asynchronously.
          .filter((link) => link.rel !== 'modulepreload')
      );
    });
  }

  if (Array.isArray(item.dynamicImports)) {
    item.dynamicImports?.forEach((srcFileName) => {
      links.push(...getLinks(manifest, srcFileName, base, true, cache, 'low'));
    });
  }

  return links;
}

const RESOLVE_URL_REG = /^(?:\w+:)?\//;
const rebase = (src: string, base: string) => {
  return RESOLVE_URL_REG.test(src) ? src : base + src;
};

function getLink(
  fileName: string,
  base: string,
  fetchpriority: 'low' | 'high' | 'auto'
): LinkDescriptor | null {
  const ext = path.extname(fileName);
  if (ext === '.js') {
    return {
      fetchpriority,
      href: rebase(fileName, base),
      rel: 'modulepreload',
    };
  }

  if (ext === '.css') {
    return {
      href: rebase(fileName, base),
      rel: 'stylesheet',
    };
  }

  const type = mime.lookup(ext) || '';
  const assertedType = type.split('/')[0] ?? '';

  if (['image', 'font'].includes(assertedType)) {
    return {
      as: assertedType,
      ...(assertedType === 'font' ? { crossorigin: '' } : {}),
      href: rebase(fileName, base),
      rel: 'preload',
      type,
    };
  }

  return null;
}

// https://developer.mozilla.org/docs/Web/JavaScript/Guide/Regular_expressions#escaping
export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export function removeAs(id: string) {
  return id.split(/\?as=.*/)[0];
}
