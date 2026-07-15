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

  it('does not include Svelte development instrumentation in the SSR bundle', () => {
    const svelteBundle = fs
      .readdirSync(path.join(playgroundRoot, 'dist/server/assets'))
      .find((file) => file.startsWith('frameworks.svelte.Counter@widget'));

    expect(svelteBundle).toBeTruthy();
    const source = fs.readFileSync(
      path.join(playgroundRoot, 'dist/server/assets', svelteBundle!),
      'utf-8'
    );
    expect(source).not.toContain('function push_element(');
  });

  it('includes alias-imported custom-extension widgets in client assets', () => {
    const manifest = JSON.parse(fs.readFileSync(clientManifestPath, 'utf-8'));
    const data = readServerAssetsData();
    const widgetIds = [
      'routes/(components)/LitCounter@widget.lit.ts',
      'routes/(components)/WebComponentCounter@widget.wc.ts',
    ];

    for (const widgetId of widgetIds) {
      expect(manifest[widgetId]?.file).toBeTruthy();
      expect(data.assetUrls[widgetId]).toBeTruthy();
    }
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
