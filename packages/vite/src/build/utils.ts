import path from 'node:path';
import type { LinkDescriptor } from '@web-widget/helpers';
import mime from 'mime-types';
import type { Manifest as ViteManifest } from 'vite';

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
