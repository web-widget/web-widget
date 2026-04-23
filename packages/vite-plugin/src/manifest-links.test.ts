import type { Manifest } from 'vite';
import { getLinks } from './manifest-links';

/**
 * Fixture filter only. Production callers pass `createFilter` from `import.include`
 * (or any predicate that marks which manifest chunk keys should be followed across `dynamicImports`).
 */
const fixtureIncludeDynamicImport = (key: string) =>
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

  test('includes stylesheets from static imports; follows dynamicImports only when filter allows', () => {
    const withoutDynamic = getLinks(
      manifest,
      'entry.client.ts',
      base,
      new Set()
    );
    const hrefsStatic = withoutDynamic.map((l) => l.href);
    expect(hrefsStatic).toContain(`${base}assets/entry-abc.css`);
    expect(hrefsStatic).toContain(`${base}assets/vendor-def.css`);
    expect(hrefsStatic).not.toContain(`${base}assets/lazy-ghi.css`);
    expect(withoutDynamic.some((l) => l.href?.includes('lazy-ghi.js'))).toBe(
      false
    );

    const withAllDynamic = getLinks(
      manifest,
      'entry.client.ts',
      base,
      new Set(),
      () => true
    );
    const hrefsAll = withAllDynamic.map((l) => l.href);
    expect(hrefsAll).toContain(`${base}assets/lazy-ghi.css`);
    expect(withAllDynamic.some((l) => l.href?.includes('lazy-ghi.js'))).toBe(
      true
    );
  });

  test('widget entry: CSS of entry included; nested dynamicImports omitted when filter excludes inner chunk', () => {
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
      new Set(),
      fixtureIncludeDynamicImport
    );
    const hrefs = links.map((l) => l.href);
    expect(hrefs).toContain(`${base}assets/w-main.css`);
    expect(hrefs).not.toContain(`${base}assets/w-inner.css`);
    expect(links.some((l) => l.href?.includes('w-inner.js'))).toBe(false);
  });

  test('route → widget boundary: follows matching dynamicImport; deeper dynamic chunk omitted by filter', () => {
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
      new Set(),
      fixtureIncludeDynamicImport
    );
    const hrefs = links.map((l) => l.href);
    expect(hrefs).toContain(`${base}assets/w.css`);
    expect(hrefs).not.toContain(`${base}assets/w-inner.css`);
    expect(links.some((l) => l.href?.includes('w-inner.js'))).toBe(false);
  });
});
