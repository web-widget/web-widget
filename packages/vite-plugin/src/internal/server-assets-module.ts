import path from 'node:path';
import type { LinkDescriptor } from '@web-widget/helpers';
import type { Manifest as ViteManifest } from 'vite';
import type { RouteClientAssets } from './collect-route-assets';
import type { WidgetModuleFilter } from '@/types';
import { getLinks, getRouteMetaLinks } from './manifest-links';
import { processCssLinks, type CssConfig } from './css-merge';
import { normalizePath } from './path';

/**
 * Virtual module id for the server-side asset resolver.
 * Server code imports `resolveWidgetAsset` / `resolveLinks` / `resolveStyle`
 * from this module to look up client-hashed URLs at runtime, decoupling
 * server transform from the client manifest. The module is statically
 * imported by the server transform (via the `virtual:` protocol handled
 * by `resolveId`).
 */
export const SERVER_ASSETS_MODULE_ID = 'virtual:web-widget-server-assets';
export const SERVER_ASSETS_RESOLVED_ID = '\0web-widget-server-assets';

/**
 * Virtual module id for the data module. Statically imported by the consumer
 * module above; at runtime it loads the real data from the emitted data file
 * (located next to the server chunk that inlines it) via `import.meta.url`
 * + `new URL(..., import.meta.url).href` + dynamic `import()`. The
 * `import.meta.url` / `URL` / dynamic `import()` are all web/ES standards
 * and keep the runtime tech-stack neutral (no `node:fs` / `node:url` /
 * `node:path`).
 */
export const SERVER_ASSETS_DATA_MODULE_ID =
  'virtual:web-widget-server-assets-data';
export const SERVER_ASSETS_DATA_RESOLVED_ID = '\0web-widget-server-assets-data';

/**
 * Data file name emitted into the server output's assets dir.
 * - At server-build time, a placeholder is emitted via `emitFile` so the
 *   data virtual module's runtime `import()` resolves to a real file.
 * - After the client build completes, this file is overwritten with the
 *   real asset URLs and link lists as a regular ES module.
 */
export const SERVER_ASSETS_DATA_FILE_NAME = '.server-assets.js';

/** Asset URL map: relative module path → fully-qualified URL (base + hashed file). */
export interface ServerAssetsData {
  assetUrls: Record<string, string>;
  /** route module / widget module → link descriptor list (CSS merged to single link at build time). */
  linkMap: Record<string, LinkDescriptor[]>;
  /** route module / widget module → inline CSS content (mutually exclusive with CSS links in linkMap). */
  styleMap: Record<string, string>;
}

/**
 * Build the runtime data that backs `virtual:web-widget-server-assets`.
 * Called after the client build completes (so the client manifest is available)
 * to produce the final content written to `.server-assets.js`.
 */
export async function buildServerAssetsData(
  manifest: ViteManifest,
  routeClientAssets: Map<string, RouteClientAssets>,
  base: string,
  root: string,
  widgetModuleFilter: WidgetModuleFilter | undefined,
  clientEntryId: string | undefined,
  cssConfig: CssConfig,
  clientOutDir: string,
  assetsDir: string
): Promise<ServerAssetsData> {
  const assetUrls: Record<string, string> = {};
  const linkMap: Record<string, LinkDescriptor[]> = {};

  // Collect asset URLs for every manifest entry (widget, CSS, entry, chunk).
  for (const [fileName, value] of Object.entries(manifest)) {
    if (value.file) {
      assetUrls[fileName] = base + value.file;
    } else if (Array.isArray(value)) {
      const file = value.find(
        (item: unknown) =>
          typeof item === 'string' && (item as string).endsWith('.js')
      );
      if (file) {
        assetUrls[fileName] = base + (file as string);
      }
    }
  }

  // Pre-compute link lists for each route module (CSS + widget links).
  // Keys are normalized relative paths so they match the routeId passed by
  // the server transform (normalizePath(path.relative(root, id))).
  const widgetModulePaths = new Set<string>();
  for (const [routeId, assets] of routeClientAssets) {
    const relativeId = normalizePath(path.relative(root, routeId));
    linkMap[relativeId] = getRouteMetaLinks(
      manifest,
      assets,
      base,
      widgetModuleFilter
    );
    // Collect widget module paths so we can generate link entries for them too.
    for (const widgetModule of assets.widgetModules) {
      widgetModulePaths.add(widgetModule);
    }
  }

  // Pre-compute link lists for each widget module (widget's own CSS).
  // Widget modules export `meta.link` which calls `resolveLinks(widgetId)`,
  // so they need their own linkMap entry to emit their CSS.
  // `widgetModule` is already a root-relative path (normalized by
  // `collectRouteModuleAssets` via `toRelativeKey`), so use it directly.
  for (const widgetModule of widgetModulePaths) {
    const relativeId = normalizePath(widgetModule);
    if (!linkMap[relativeId]) {
      linkMap[relativeId] = getLinks(
        manifest,
        relativeId,
        base,
        new Set(),
        widgetModuleFilter
      );
    }
  }

  // Pre-compute links for the client entry (used by server-entry plugin).
  if (clientEntryId) {
    linkMap[clientEntryId] = getLinks(
      manifest,
      clientEntryId,
      base,
      new Set(),
      widgetModuleFilter
    );
  }

  // Process CSS links: inline small CSS into `styleMap`, merge remaining CSS
  // into single files. Non-CSS links (modulepreload, preload, etc.) are
  // preserved in `linkMap`.
  const { linkMap: processedLinkMap, styleMap } = await processCssLinks({
    linkMap,
    base,
    clientOutDir,
    assetsDir,
    cssConfig,
  });

  // Build-time validation: ensure every widget module referenced by the
  // server import graph has a corresponding chunk in the client manifest.
  // This catches typos and missing client entries at build time rather than
  // at runtime when `resolveWidgetAsset` would throw.
  const missingWidgets = [...widgetModulePaths].filter((id) => !assetUrls[id]);
  if (missingWidgets.length) {
    throw new Error(
      `[web-widget] Widget asset(s) not found in client manifest (referenced by server but no chunk was emitted):\n${missingWidgets.join('\n')}\nEnsure these modules are included in the client build.`
    );
  }

  return { assetUrls, linkMap: processedLinkMap, styleMap };
}

/**
 * Generate the source code for the consumer virtual module
 * (`virtual:web-widget-server-assets`).
 *
 * The module code is fixed at server-build time (it does NOT depend on the
 * client manifest) so it can be safely inlined into referencing chunks. It
 * statically imports the data virtual module
 * (`virtual:web-widget-server-assets-data`), which in turn loads the real
 * data from the emitted data file at runtime.
 */
export function generateServerAssetsModuleCode(): string {
  return [
    `/* web-widget: server assets — statically imports the data virtual module */`,
    `import { assetUrls, linkMap, styleMap } from ${JSON.stringify(
      SERVER_ASSETS_DATA_MODULE_ID
    )};`,
    `export function resolveWidgetAsset(id) {`,
    `  const url = assetUrls[id];`,
    `  if (!url) throw new Error("Widget asset not found: " + id);`,
    `  return url;`,
    `}`,
    `export function resolveLinks(id) {`,
    `  return linkMap[id] ?? [];`,
    `}`,
    `export function resolveStyle(id) {`,
    `  return styleMap[id];`,
    `}`,
    `export { assetUrls, linkMap, styleMap };`,
    ``,
  ].join('\n');
}

/**
 * Generate the dev-mode source code for the consumer virtual module
 * (`virtual:web-widget-server-assets`).
 *
 * In dev, CSS is collected by `dev/meta.ts` via the server module graph,
 * so the virtual module only needs to provide empty data + stub resolvers
 * that never throw (widget imports resolve to source files directly, and
 * link lists are computed by the dev middleware).
 */
export function generateServerAssetsDevModuleCode(): string {
  return [
    `/* web-widget: server assets — dev stub (real data computed by dev middleware) */`,
    `const assetUrls = Object.create(null);`,
    `const linkMap = Object.create(null);`,
    `const styleMap = Object.create(null);`,
    `export function resolveWidgetAsset(id) {`,
    `  return assetUrls[id];`,
    `}`,
    `export function resolveLinks(_id) {`,
    `  return [];`,
    `}`,
    `export function resolveStyle(_id) {`,
    `  return undefined;`,
    `}`,
    `export { assetUrls, linkMap, styleMap };`,
    ``,
  ].join('\n');
}

/**
 * Generate the source code for the data virtual module
 * (`virtual:web-widget-server-assets-data`).
 *
 * The module is fixed at server-build time. At runtime it computes the
 * data file URL via `import.meta.url` + `new URL(..., import.meta.url)`
 * (web standards, no node built-ins) and loads the data file with a
 * dynamic `import()`. The data file is emitted into the server output's
 * assets dir at server-build time (placeholder) and overwritten with the
 * real data after the client build completes.
 */
export function generateServerAssetsDataModuleCode(): string {
  return [
    `/* web-widget: server assets data — loaded from emitted data file */`,
    `const dataUrl = new URL('./${SERVER_ASSETS_DATA_FILE_NAME}', import.meta.url).href;`,
    `const mod = await import(dataUrl);`,
    `const assetUrls = mod.assetUrls;`,
    `const linkMap = mod.linkMap;`,
    `const styleMap = mod.styleMap;`,
    `export { assetUrls, linkMap, styleMap };`,
    ``,
  ].join('\n');
}

/**
 * Placeholder content for the data file, emitted at server-build time
 * (used when the server-only build runs without a client build, e.g. when
 * `shouldBuildClient` returns false). Real data is written by
 * `writeServerAssetsDataFile` after the client build completes.
 */
export function generateServerAssetsPlaceholderCode(): string {
  return [
    `/* web-widget: server assets data — placeholder, populated after client build */`,
    `export const assetUrls = Object.create(null);`,
    `export const linkMap = Object.create(null);`,
    `export const styleMap = Object.create(null);`,
    ``,
  ].join('\n');
}

/**
 * Serialize server assets data as a JS module that exports `assetUrls`
 * and `linkMap`. Values are embedded via `JSON.stringify` (a JS language
 * primitive, no module import needed) so all strings are safely escaped.
 */
export function serializeServerAssetsData(data: ServerAssetsData): string {
  return [
    `/* web-widget: server assets data — generated after client build */`,
    `export const assetUrls = ${JSON.stringify(data.assetUrls)};`,
    `export const linkMap = ${JSON.stringify(data.linkMap)};`,
    `export const styleMap = ${JSON.stringify(data.styleMap)};`,
    ``,
  ].join('\n');
}
