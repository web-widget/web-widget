import path from 'node:path';
import fs from 'node:fs/promises';
import type { Manifest, ResolvedConfig, Manifest as ViteManifest } from 'vite';
import { normalizePath } from 'vite';
import type { ImportSpecifier } from 'es-module-lexer';
import type { LinkDescriptor } from '@web-widget/helpers';
import mime from 'mime-types';
import { WEB_ROUTER_PLUGIN_NAME } from './constants';
import type { ResolvedWebRouterConfig, WebRouterPlugin } from './types';

/**
 * Extracts all import names for an already parsed files
 */
export function importsToImportNames(
  imports: Iterable<ImportSpecifier>,
  source: string
) {
  const allImportNames = [];
  for (const singleImport of imports) {
    const importStatement = source.substring(singleImport.ss, singleImport.se);
    const importNames = getImportNames(importStatement);
    allImportNames.push(...importNames);
  }
  return allImportNames;
}

/**
 * Extracts all import names from a full import statement
 *
 * import { html, css as litCss } from 'lit';
 * => [{ name: 'html' }, { name: 'css', alias: 'litCss' }]
 */
export function getImportNames(importStatement: string) {
  const importNames: [name: string, alias?: string][] = [];

  const singleLine = importStatement.trim().replace(/\n/g, '');
  const fromIndex = singleLine.indexOf('from');
  if (fromIndex >= 0) {
    const importPart = singleLine.substring(6, fromIndex);
    const cleanedImportPart = importPart.replace(/[{}]/g, '');
    const importStatementParts = cleanedImportPart
      .split(',')
      .map((el) => el.trim())
      .filter(Boolean);

    for (const importName of importStatementParts) {
      if (importName.includes(' as ')) {
        const v = importName.split(' as ');
        importNames.push([v[0].trim(), v[1].trim()]);
        // TODO: Handle default imports
      } else {
        importNames.push([importName]);
      }
    }
    return importNames;
  }

  return importNames;
}

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
  if (fileName.endsWith('.js')) {
    return {
      fetchpriority,
      href: rebase(fileName, base),
      rel: 'modulepreload',
    };
  } else if (fileName.endsWith('.css')) {
    return {
      href: rebase(fileName, base),
      rel: 'stylesheet',
    };
  }

  const ext = path.extname(fileName);
  const type = mime.lookup(ext);
  const asValue = type ? type.split('/')[0] : '';

  if (type && ['image', 'font'].includes(asValue)) {
    return {
      as: asValue,
      ...(asValue === 'font' ? { crossorigin: '' } : {}),
      href: rebase(fileName, base),
      rel: 'preload',
      type,
    };
  }

  return null;
}
