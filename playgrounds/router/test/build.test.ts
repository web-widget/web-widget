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

function readClientManifest() {
  return JSON.parse(fs.readFileSync(clientManifestPath, 'utf-8')) as Record<
    string,
    {
      file?: string;
      isEntry?: boolean;
      css?: string[];
    }
  >;
}

describe('vite build integration', () => {
  it('produces client manifest and server entry artifacts', () => {
    expect(fs.existsSync(clientManifestPath)).toBe(true);
    expect(fs.existsSync(serverEntryPath)).toBe(true);
    expect(
      fs.existsSync(path.join(playgroundRoot, 'dist/server/package.json'))
    ).toBe(true);

    const manifest = readClientManifest();
    expect(manifest['entry.client.ts']).toBeDefined();

    const serverSource = fs.readFileSync(serverEntryPath, 'utf-8');
    expect(serverSource).toContain('WebRouter');
  });

  it('keeps route modules out of client rolldown entries (Direction A)', () => {
    const manifest = readClientManifest();

    const routeEntries = Object.entries(manifest).filter(
      ([key, value]) =>
        value.isEntry &&
        (key.includes('@route') ||
          key.includes('@layout') ||
          key.includes('@fallback'))
    );
    expect(routeEntries).toEqual([]);

    const widgetEntries = Object.entries(manifest).filter(
      ([key, value]) => value.isEntry && key.includes('@widget')
    );
    expect(widgetEntries.length).toBeGreaterThan(0);
  });

  it('does not treat async route chunk css as standalone client entries', () => {
    const manifest = readClientManifest();

    expect(manifest['routes/(css-lazy)/lazy-chunk.css']).toBeUndefined();

    const asyncRouteCssEntries = Object.entries(manifest).filter(
      ([key, value]) =>
        value.isEntry &&
        key.includes('lazy-chunk.css') &&
        !key.includes('@widget')
    );
    expect(asyncRouteCssEntries).toEqual([]);
  });

  it('does not inject async route chunk css into css-lazy-dynamic meta links', () => {
    const routeModulePath = path.join(
      playgroundRoot,
      'dist/server/assets/css-lazy-dynamic@route2.js'
    );

    expect(fs.existsSync(routeModulePath)).toBe(true);

    const routeModuleSource = fs.readFileSync(routeModulePath, 'utf-8');
    const linkInjection = routeModuleSource.match(
      /\(\(meta\) => \{[\s\S]*?const link = (\[[\s\S]*?\]);[\s\S]*?\}\)\(meta\);/
    );
    expect(linkInjection).toBeTruthy();

    const injectedLinks = JSON.parse(linkInjection![1]) as Array<{
      href?: string;
      rel?: string;
    }>;
    const hrefs = injectedLinks.map((link) => link.href ?? '');

    expect(hrefs.some((href) => href.includes('lazy-chunk'))).toBe(false);
    expect(hrefs.some((href) => href.includes('_css-lazy_'))).toBe(false);
  });
});
