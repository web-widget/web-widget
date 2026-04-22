import type { Manifest } from 'vite';
import { getLinks } from './manifest-links';

/** Fixture naming only; production callers pass `createFilter` from real `import.include`. */
const fixtureIsWidgetManifestKey = (key: string) =>
  /^[^?]*[.@]widget\.[^?]*$/.test(key);

describe('getLinks', () => {
  const base = '/';
  const manifest = {
    'entry.client.ts': {
      file: 'assets/entry-abc.js',
      src: 'entry.client.ts',
      imports: ['chunk-vendor.js'],
      dynamicImports: ['chunk-lazy.js'],
      css: ['assets/entry-abc.css'],
    },
    'chunk-vendor.js': {
      file: 'assets/vendor-def.js',
      src: 'chunk-vendor.js',
      imports: [],
      dynamicImports: [],
      css: ['assets/vendor-def.css'],
    },
    'chunk-lazy.js': {
      file: 'assets/lazy-ghi.js',
      src: 'chunk-lazy.js',
      imports: [],
      dynamicImports: [],
      css: ['assets/lazy-ghi.css'],
    },
  } as unknown as Manifest;

  test('route scope: includes stylesheets from dynamic import subgraph', () => {
    const links = getLinks(
      manifest,
      'entry.client.ts',
      base,
      false,
      new Set(),
      'auto',
      () => false
    );
    const hrefs = links.map((l) => l.href);
    expect(hrefs).toContain(`${base}assets/entry-abc.css`);
    expect(hrefs).toContain(`${base}assets/vendor-def.css`);
    expect(hrefs).toContain(`${base}assets/lazy-ghi.css`);
    expect(links.some((l) => l.href?.includes('lazy-ghi.js'))).toBe(true);
  });

  test('widget scope: omits own JS and CSS from dynamic import subgraph by default', () => {
    const widgetManifest = {
      'routes/CssLazy@widget.tsx': {
        file: 'assets/w-main.js',
        src: 'routes/CssLazy@widget.tsx',
        imports: [],
        dynamicImports: ['assets/w-inner.js'],
        css: ['assets/w-main.css'],
      },
      'assets/w-inner.js': {
        file: 'assets/w-inner.js',
        src: 'assets/w-inner.js',
        imports: [],
        dynamicImports: [],
        css: ['assets/w-inner.css'],
      },
    } as unknown as Manifest;

    const links = getLinks(
      widgetManifest,
      'routes/CssLazy@widget.tsx',
      base,
      false,
      new Set(),
      'auto',
      fixtureIsWidgetManifestKey
    );
    const hrefs = links.map((l) => l.href);
    expect(hrefs).toContain(`${base}assets/w-main.css`);
    expect(hrefs).not.toContain(`${base}assets/w-inner.css`);
    expect(links.some((l) => l.href?.includes('w-inner.js'))).toBe(false);
  });

  test('route → dynamic → widget: widget own assets included, inner dynamic JS/CSS omitted', () => {
    const m = {
      'routes/page@route.tsx': {
        file: 'assets/page.js',
        src: 'routes/page@route.tsx',
        imports: [],
        dynamicImports: ['routes/CssLazy@widget.tsx'],
        css: [],
      },
      'routes/CssLazy@widget.tsx': {
        file: 'assets/w.js',
        src: 'routes/CssLazy@widget.tsx',
        imports: [],
        dynamicImports: ['assets/w-inner.js'],
        css: ['assets/w.css'],
      },
      'assets/w-inner.js': {
        file: 'assets/w-inner.js',
        src: 'assets/w-inner.js',
        imports: [],
        dynamicImports: [],
        css: ['assets/w-inner.css'],
      },
    } as unknown as Manifest;

    const links = getLinks(
      m,
      'routes/page@route.tsx',
      base,
      false,
      new Set(),
      'auto',
      fixtureIsWidgetManifestKey
    );
    const hrefs = links.map((l) => l.href);
    expect(hrefs).toContain(`${base}assets/w.css`);
    expect(hrefs).not.toContain(`${base}assets/w-inner.css`);
    expect(links.some((l) => l.href?.includes('w-inner.js'))).toBe(false);
  });
});
