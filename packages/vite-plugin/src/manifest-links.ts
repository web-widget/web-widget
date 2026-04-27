import path from 'node:path';
import type { LinkDescriptor } from '@web-widget/helpers';
import mime from 'mime-types';
import type { Manifest as ViteManifest } from 'vite';

import type { DynamicImportPredicate } from './types';

export type { DynamicImportPredicate };

const RESOLVE_URL_REG = /^(?:\w+:)?\//;
const rebase = (src: string, base: string) => {
  return RESOLVE_URL_REG.test(src) ? src : base + src;
};

function getLink(fileName: string, base: string): LinkDescriptor | null {
  const ext = path.extname(fileName);
  if (ext === '.js') {
    return {
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

function getLinksInternal(
  manifest: ViteManifest,
  srcFileName: string,
  base: string,
  containSelf: boolean,
  cache: Set<string>,
  dynamicImportPredicate?: DynamicImportPredicate
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

  const push = (assetFileName: string) => {
    const ld = getLink(assetFileName, base);
    const href = ld?.href;
    if (!ld || !href || cache.has(href)) {
      return;
    }
    links.push(ld);
    cache.add(href);
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
    item.imports.forEach((dep) => {
      links.push(
        ...getLinksInternal(
          manifest,
          dep,
          base,
          true,
          cache,
          dynamicImportPredicate
        )
          // Note: In the web router, all client components are loaded asynchronously.
          .filter((link) => link.rel !== 'modulepreload')
      );
    });
  }

  if (dynamicImportPredicate && Array.isArray(item.dynamicImports)) {
    item.dynamicImports.filter(dynamicImportPredicate).forEach((dep) => {
      links.push(
        ...getLinksInternal(
          manifest,
          dep,
          base,
          true,
          cache,
          dynamicImportPredicate
        )
      );
    });
  }

  return links;
}

/**
 * Collect `<link>` descriptors from a Vite client manifest entry.
 */
export function getLinks(
  manifest: ViteManifest,
  srcFileName: string,
  base: string,
  cache: Set<string> = new Set(),
  dynamicImportPredicate?: DynamicImportPredicate
): LinkDescriptor[] {
  return getLinksInternal(
    manifest,
    srcFileName,
    base,
    false,
    cache,
    dynamicImportPredicate
  );
}
