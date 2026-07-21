import path from 'node:path';
import type { LinkDescriptor } from '@web-widget/helpers';
import mime from 'mime-types';
import type { Manifest as ViteManifest } from 'vite';

import type { RouteClientAssets } from '@/internal/collect-route-assets';
import type { WidgetModuleFilter, WidgetRoot } from '@/types';
import { stripModuleIdQuery } from '@/internal/module-id';
import { getWidgetStyleOwner } from '@/internal/widget-style-ownership';

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
  widgetModuleFilter?: WidgetModuleFilter,
  widgetChunkKeys: Set<string> = new Set()
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
  } else if (
    path.extname(srcFileName) === '.css' &&
    item.file.endsWith('.css')
  ) {
    // Plain CSS rolldown entries use the stylesheet as `file` with no `css` array.
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
          widgetModuleFilter,
          widgetChunkKeys
        )
          // Note: In the web router, all client components are loaded asynchronously.
          .filter((link) => link.rel !== 'modulepreload')
      );
    });
  }

  const canFollowDynamicImport = (dep: string) => {
    if (!widgetModuleFilter) {
      return false;
    }
    const depPath = stripModuleIdQuery(dep);
    return (
      widgetModuleFilter(dep) ||
      widgetModuleFilter(depPath) ||
      widgetChunkKeys.has(dep)
    );
  };

  if (widgetModuleFilter && Array.isArray(item.dynamicImports)) {
    item.dynamicImports.filter(canFollowDynamicImport).forEach((dep) => {
      links.push(
        ...getLinksInternal(
          manifest,
          dep,
          base,
          true,
          cache,
          widgetModuleFilter,
          widgetChunkKeys
        )
      );
    });
  }

  return links;
}

/** Collect `<link>` descriptors for a route module asset graph. */
export function getRouteMetaLinks(
  manifest: ViteManifest,
  assets: RouteClientAssets,
  base: string,
  widgetModuleFilter?: WidgetModuleFilter,
  widgetRoot: WidgetRoot = 'light'
): LinkDescriptor[] {
  const cache = new Set<string>();
  const links: LinkDescriptor[] = [];

  for (const cssModule of assets.cssModules) {
    links.push(...getLinks(manifest, cssModule, base, cache));
  }

  for (const widgetModule of assets.widgetModules) {
    if (getWidgetStyleOwner(widgetRoot) === 'boundary') continue;
    links.push(
      ...getLinks(manifest, widgetModule, base, cache, widgetModuleFilter)
    );
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
  widgetModuleFilter?: WidgetModuleFilter
): LinkDescriptor[] {
  const widgetChunkKeys = new Set<string>();
  if (widgetModuleFilter) {
    for (const [key, item] of Object.entries(manifest)) {
      const source = item.src ? stripModuleIdQuery(item.src) : undefined;
      if (
        !widgetModuleFilter(key) &&
        (!source || !widgetModuleFilter(source))
      ) {
        continue;
      }
      item.imports?.forEach((dependency) => widgetChunkKeys.add(dependency));
    }
  }

  return getLinksInternal(
    manifest,
    srcFileName,
    base,
    false,
    cache,
    widgetModuleFilter,
    widgetChunkKeys
  );
}
