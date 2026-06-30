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
  'dist/client/.manifest.json'
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
};

function readServerAssetsData(): ServerAssetsData {
  const source = fs.readFileSync(serverAssetsDataPath, 'utf-8');
  const assetUrlsMatch = source.match(
    /export const assetUrls = (\{[\s\S]*?\});/
  );
  const linkMapMatch = source.match(/export const linkMap = (\{[\s\S]*?\});/);
  if (!assetUrlsMatch || !linkMapMatch) {
    throw new Error('Failed to parse server assets data file.');
  }
  return {
    assetUrls: JSON.parse(assetUrlsMatch[1]),
    linkMap: JSON.parse(linkMapMatch[1]),
  };
}

function readRouteLinks(routeId: string): LinkEntry[] {
  return readServerAssetsData().linkMap[routeId] ?? [];
}

describe('vite build integration', () => {
  it('produces server entry artifacts without leaking manifest to disk', () => {
    // Manifest is passed in-memory; the file should NOT exist on disk.
    expect(fs.existsSync(clientManifestPath)).toBe(false);
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
      'dist/server/assets/_vue3_.helpers.js'
    );
    expect(fs.existsSync(routeModulePath)).toBe(true);

    const routeModuleSource = fs.readFileSync(routeModulePath, 'utf-8');
    expect(routeModuleSource).toContain(
      'resolveLinks("routes/react-and-vue@route.tsx")'
    );

    const hrefs = readRouteLinks('routes/react-and-vue@route.tsx').map(
      (link) => link.href ?? ''
    );

    expect(hrefs.some((href) => href.includes('counter-common'))).toBe(true);
  });
});
