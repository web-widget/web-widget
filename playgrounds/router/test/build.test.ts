import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const playgroundRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const clientManifestPath = path.join(
  playgroundRoot,
  'dist/client/.vite/manifest.json'
);
const serverEntryPath = path.join(playgroundRoot, 'dist/server/index.js');
const serverAssetsDataPath = path.join(
  playgroundRoot,
  'dist/server/assets/.server-assets.js'
);

type LinkEntry = { href?: string; rel?: string };
type ServerAssetsData = {
  assetUrls: Record<string, string>;
  linkMap: Record<string, LinkEntry[]>;
  styleMap: Record<string, string>;
};

function readServerAssetsData(): ServerAssetsData {
  const source = fs.readFileSync(serverAssetsDataPath, 'utf-8');
  const assetUrlsMatch = source.match(
    /export const assetUrls = (\{[\s\S]*?\});/
  );
  const linkMapMatch = source.match(/export const linkMap = (\{[\s\S]*?\});/);
  const styleMapMatch = source.match(/export const styleMap = (\{[\s\S]*?\});/);
  if (!assetUrlsMatch || !linkMapMatch) {
    throw new Error('Failed to parse server assets data file.');
  }
  return {
    assetUrls: JSON.parse(assetUrlsMatch[1]),
    linkMap: JSON.parse(linkMapMatch[1]),
    styleMap: styleMapMatch ? JSON.parse(styleMapMatch[1]) : {},
  };
}

function readRouteLinks(routeId: string): LinkEntry[] {
  return readServerAssetsData().linkMap[routeId] ?? [];
}

describe('vite build integration', () => {
  it('produces server entry artifacts and keeps the client manifest on disk', () => {
    // The manifest file is controlled by Vite's `build.manifest` config and
    // left on disk for external tooling to consume.
    expect(fs.existsSync(clientManifestPath)).toBe(true);
    expect(fs.existsSync(serverEntryPath)).toBe(true);
    expect(
      fs.existsSync(path.join(playgroundRoot, 'dist/server/package.json'))
    ).toBe(true);

    const serverSource = fs.readFileSync(serverEntryPath, 'utf-8');
    expect(serverSource).toContain('WebRouter');
  });

  it('does not inject async route chunk css into css-lazy-dynamic meta links', () => {
    // The route module should resolve links at runtime via `resolveLinks`
    // (data lives in the server assets data file, not inlined in the chunk).
    const routeModulePath = path.join(
      playgroundRoot,
      'dist/server/assets/css-lazy-dynamic@route.js'
    );
    expect(fs.existsSync(routeModulePath)).toBe(true);

    const routeModuleSource = fs.readFileSync(routeModulePath, 'utf-8');
    expect(routeModuleSource).toContain(
      'resolveLinks("routes/css-lazy-dynamic@route.tsx")'
    );

    const hrefs = readRouteLinks('routes/css-lazy-dynamic@route.tsx').map(
      (link) => link.href ?? ''
    );

    expect(hrefs.some((href) => href.includes('lazy-chunk'))).toBe(false);
    expect(hrefs.some((href) => href.includes('_css-lazy_'))).toBe(false);
  });

  it('injects Counter widget CSS into react-and-vue route meta links', () => {
    const routeModulePath = path.join(
      playgroundRoot,
      'dist/server/assets/react-and-vue@route.js'
    );
    expect(fs.existsSync(routeModulePath)).toBe(true);

    const routeModuleSource = fs.readFileSync(routeModulePath, 'utf-8');
    expect(routeModuleSource).toContain(
      'resolveLinks("routes/react-and-vue@route.tsx")'
    );

    const data = readServerAssetsData();
    const routeHrefs = (
      data.linkMap['routes/react-and-vue@route.tsx'] ?? []
    ).map((link) => link.href ?? '');
    const routeStyle = data.styleMap['routes/react-and-vue@route.tsx'];

    // Widget CSS is included in the route module's links/styles (merged/inlined
    // together with route CSS at build time).
    const hasCssLink = routeHrefs.some((href) =>
      href.includes('counter-common')
    );
    const hasInlineStyle = routeStyle && routeStyle.includes('counter');
    // CSS may be merged into a single file with a hash name; check the file
    // content for counter styles.
    const hasMergedCss = routeHrefs.some((href) => {
      if (!href.startsWith('/assets/')) return false;
      const cssPath = path.join(playgroundRoot, 'dist/client', href);
      if (!fs.existsSync(cssPath)) return false;
      return fs.readFileSync(cssPath, 'utf-8').includes('.counter');
    });
    expect(hasCssLink || hasInlineStyle || hasMergedCss).toBe(true);
  });

  it('preserves Vue SFC CSS Modules class-name exports in SSR build', () => {
    // The Vue SFC <style module> block must NOT be skipped in SSR build —
    // its hashed class names are needed for SSR rendering.
    const widgetModulePath = path.join(
      playgroundRoot,
      'dist/server/assets/_vue3_.ModuleCss@widget.vue.js'
    );
    expect(fs.existsSync(widgetModulePath)).toBe(true);

    const source = fs.readFileSync(widgetModulePath, 'utf-8');
    // The CSS Modules export must not be an empty object.
    expect(source).not.toContain(
      'ModuleCss_widget_vue_vue_type_style_index_0_lang_module_default = {};'
    );
  });
});
