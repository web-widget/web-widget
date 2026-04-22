import path from 'node:path';
import type { LinkDescriptor } from '@web-widget/helpers';
import mime from 'mime-types';
import type { Manifest as ViteManifest } from 'vite';

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

function getLinksInternal(
  manifest: ViteManifest,
  srcFileName: string,
  base: string,
  containSelf: boolean,
  cache: Set<string>,
  fetchpriority: 'low' | 'high' | 'auto',
  isWidgetKey: (key: string) => boolean,
  widgetCssCutoff: boolean,
  fromDynamic: boolean,
  allowOwn: boolean
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

  /** Omit this chunk's own entry JS (modulepreload) and extracted CSS from meta when under widget dynamic subgraph. */
  const omitOwnDynamicBundle = widgetCssCutoff && fromDynamic && !allowOwn;

  const push = (assetFileName: string) => {
    const ld = getLink(assetFileName, base, fetchpriority);
    const href = ld?.href;
    if (!ld || !href || cache.has(href)) {
      return;
    }
    if (
      omitOwnDynamicBundle &&
      (ld.rel === 'stylesheet' || ld.rel === 'modulepreload')
    ) {
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
    item.imports?.forEach((dep) => {
      const nextCutoff = widgetCssCutoff || isWidgetKey(dep);

      links.push(
        ...getLinksInternal(
          manifest,
          dep,
          base,
          true,
          cache,
          fetchpriority,
          isWidgetKey,
          nextCutoff,
          false,
          false
        ).filter((link) => link.rel !== 'modulepreload')
      );
    });
  }

  if (Array.isArray(item.dynamicImports)) {
    item.dynamicImports?.forEach((dep) => {
      const depIsWidget = isWidgetKey(dep);
      const nextCutoff =
        !widgetCssCutoff && depIsWidget ? true : widgetCssCutoff;
      const nextFromDynamic = true;
      const nextAllowOwn = !widgetCssCutoff && depIsWidget ? true : false;

      links.push(
        ...getLinksInternal(
          manifest,
          dep,
          base,
          true,
          cache,
          'low',
          isWidgetKey,
          nextCutoff,
          nextFromDynamic,
          nextAllowOwn
        )
      );
    });
  }

  return links;
}

/**
 * Collect `<link>` descriptors from a Vite client manifest entry.
 * Pass `() => false` for `isWidgetManifestKey` when no manifest key is a widget (e.g. client entry).
 */
export function getLinks(
  manifest: ViteManifest,
  srcFileName: string,
  base: string,
  containSelf: boolean = false,
  cache: Set<string> = new Set(),
  fetchpriority: 'low' | 'high' | 'auto' = 'auto',
  isWidgetManifestKey: (manifestKey: string) => boolean
): LinkDescriptor[] {
  const widgetEntry = isWidgetManifestKey(srcFileName);

  return getLinksInternal(
    manifest,
    srcFileName,
    base,
    containSelf,
    cache,
    fetchpriority,
    isWidgetManifestKey,
    widgetEntry,
    false,
    false
  );
}
