import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Manifest } from 'vite';
import { collectRouteModuleAssets } from './collect-route-assets';
import { getLinks, getRouteMetaLinks } from './manifest-links';

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

  test('nested dynamicImport(widget) inside widget still emits CSS when inner key matches predicate', () => {
    const m = {
      'routes/Outer@widget.tsx': {
        file: 'assets/outer.js',
        src: 'routes/Outer@widget.tsx',
        imports: [],
        dynamicImports: ['routes/Inner@widget.tsx'],
        css: ['assets/outer.css'],
      },
      'routes/Inner@widget.tsx': {
        file: 'assets/inner.js',
        src: 'routes/Inner@widget.tsx',
        imports: [],
        dynamicImports: ['routes/Third@widget.tsx'],
        css: ['assets/inner.css'],
      },
      'routes/Third@widget.tsx': {
        file: 'assets/third.js',
        src: 'routes/Third@widget.tsx',
        imports: [],
        dynamicImports: [],
        css: ['assets/third.css'],
      },
    } as unknown as Manifest;

    const links = getLinks(
      m,
      'routes/Outer@widget.tsx',
      base,
      new Set(),
      fixtureIncludeDynamicImport
    );
    const hrefs = links.map((l) => l.href);
    expect(hrefs).toContain(`${base}assets/outer.css`);
    expect(hrefs).toContain(`${base}assets/inner.css`);
    expect(hrefs).toContain(`${base}assets/third.css`);
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

  test('dynamicImport with ?as= query still matches predicate written for source path', () => {
    const m = {
      'routes/page@route.tsx': {
        file: 'assets/page.js',
        src: 'routes/page@route.tsx',
        imports: [],
        dynamicImports: ['routes/Demo@widget.vue?as=jsx'],
        css: [],
      },
      'routes/Demo@widget.vue?as=jsx': {
        file: 'assets/demo-widget.js',
        src: 'routes/Demo@widget.vue?as=jsx',
        imports: [],
        dynamicImports: [],
        css: ['assets/demo-widget.css'],
      },
    } as unknown as Manifest;

    // Common user predicate: match widget source path without query parameters.
    const predicate = (key: string) => /[.@]widget\.[^?]*$/.test(key);
    const links = getLinks(
      m,
      'routes/page@route.tsx',
      base,
      new Set(),
      predicate
    );
    expect(links.map((l) => l.href)).toContain(`${base}assets/demo-widget.css`);
  });

  test('static import chain propagates dynamicImportPredicate: intermediary chunk’s dynamicImport(widget) still emits CSS', () => {
    const m = {
      'routes/page@route.tsx': {
        file: 'assets/page.js',
        src: 'routes/page@route.tsx',
        imports: ['assets/bridge.js'],
        dynamicImports: [],
        css: [],
      },
      'assets/bridge.js': {
        file: 'assets/bridge.js',
        src: 'assets/bridge.js',
        imports: [],
        dynamicImports: ['routes/Widget@widget.tsx'],
        css: [],
      },
      'routes/Widget@widget.tsx': {
        file: 'assets/w.js',
        src: 'routes/Widget@widget.tsx',
        imports: [],
        dynamicImports: [],
        css: ['assets/w.css'],
      },
    } as unknown as Manifest;

    const withoutPredicate = getLinks(
      m,
      'routes/page@route.tsx',
      base,
      new Set()
    );
    expect(withoutPredicate.map((l) => l.href)).not.toContain(
      `${base}assets/w.css`
    );

    const links = getLinks(
      m,
      'routes/page@route.tsx',
      base,
      new Set(),
      fixtureIncludeDynamicImport
    );
    expect(links.map((l) => l.href)).toContain(`${base}assets/w.css`);
  });

  test('multi-hop static imports still propagate dynamicImportPredicate before dynamicImport(widget)', () => {
    const m = {
      'routes/page@route.tsx': {
        file: 'assets/page.js',
        src: 'routes/page@route.tsx',
        imports: ['assets/helper.js'],
        dynamicImports: [],
        css: [],
      },
      'assets/helper.js': {
        file: 'assets/helper.js',
        src: 'assets/helper.js',
        imports: ['assets/bridge.js'],
        dynamicImports: [],
        css: [],
      },
      'assets/bridge.js': {
        file: 'assets/bridge.js',
        src: 'assets/bridge.js',
        imports: [],
        dynamicImports: ['routes/Widget@widget.tsx'],
        css: [],
      },
      'routes/Widget@widget.tsx': {
        file: 'assets/w.js',
        src: 'routes/Widget@widget.tsx',
        imports: [],
        dynamicImports: [],
        css: ['assets/w.css'],
      },
    } as unknown as Manifest;

    const links = getLinks(
      m,
      'routes/page@route.tsx',
      base,
      new Set(),
      fixtureIncludeDynamicImport
    );
    expect(links.map((l) => l.href)).toContain(`${base}assets/w.css`);
  });
});

describe('getRouteMetaLinks', () => {
  const base = '/';

  test('includes plain CSS rolldown entries and CSS modules', () => {
    const manifest = {
      'routes/global.css': {
        file: 'assets/global-abc.css',
        src: 'routes/global.css',
        isEntry: true,
      },
      'routes/shared.module.css': {
        file: 'assets/shared-module.js',
        src: 'routes/shared.module.css',
        css: ['assets/shared-abc.css'],
      },
    } as unknown as Manifest;

    const links = getRouteMetaLinks(
      manifest,
      {
        cssModules: ['routes/global.css', 'routes/shared.module.css'],
        widgetModules: [],
      },
      base
    );
    const hrefs = links.map((l) => l.href);
    expect(hrefs).toContain(`${base}assets/global-abc.css`);
    expect(hrefs).toContain(`${base}assets/shared-abc.css`);
    expect(hrefs).not.toContain(`${base}assets/shared-module.js`);
  });

  test('omits async route chunk css when collectRouteModuleAssets skips it', () => {
    const manifest = {
      'routes/layout.css': {
        file: 'assets/layout-abc.css',
        src: 'routes/layout.css',
        isEntry: true,
      },
      'routes/(css-lazy)/lazy-chunk.css': {
        file: 'assets/lazy-chunk-abc.css',
        src: 'routes/(css-lazy)/lazy-chunk.css',
        isEntry: true,
      },
      'routes/(css-lazy)/CssLazyDynamicWidget@widget.tsx': {
        file: 'assets/widget-abc.js',
        src: 'routes/(css-lazy)/CssLazyDynamicWidget@widget.tsx',
        imports: [],
        dynamicImports: ['routes/(css-lazy)/WidgetInnerLazyChunk.tsx'],
        css: ['assets/widget-abc.css'],
      },
      'routes/(css-lazy)/WidgetInnerLazyChunk.tsx': {
        file: 'assets/inner-lazy.js',
        src: 'routes/(css-lazy)/WidgetInnerLazyChunk.tsx',
        css: ['assets/inner-lazy.css'],
      },
    } as unknown as Manifest;

    const links = getRouteMetaLinks(
      manifest,
      {
        cssModules: ['routes/layout.css'],
        widgetModules: ['routes/(css-lazy)/CssLazyDynamicWidget@widget.tsx'],
      },
      base,
      fixtureIncludeDynamicImport
    );
    const hrefs = links.map((l) => l.href);

    expect(hrefs).toContain(`${base}assets/layout-abc.css`);
    expect(hrefs).toContain(`${base}assets/widget-abc.css`);
    expect(hrefs).not.toContain(`${base}assets/lazy-chunk-abc.css`);
    expect(hrefs).not.toContain(`${base}assets/inner-lazy.css`);
  });

  test('includes layout css and widget css discovered from route assets', () => {
    const manifest = {
      'routes/(components)/base-layout.css': {
        file: 'assets/base-layout-abc.css',
        src: 'routes/(components)/base-layout.css',
        isEntry: true,
      },
      'routes/(components)/Counter@widget.tsx': {
        file: 'assets/counter-widget.js',
        src: 'routes/(components)/Counter@widget.tsx',
        imports: [],
        dynamicImports: [],
        css: ['assets/counter-common-abc.css'],
      },
    } as unknown as Manifest;

    const links = getRouteMetaLinks(
      manifest,
      {
        cssModules: ['routes/(components)/base-layout.css'],
        widgetModules: ['routes/(components)/Counter@widget.tsx'],
      },
      base,
      fixtureIncludeDynamicImport
    );
    const hrefs = links.map((l) => l.href);

    expect(hrefs).toContain(`${base}assets/base-layout-abc.css`);
    expect(hrefs).toContain(`${base}assets/counter-common-abc.css`);
  });

  test('collectRouteModuleAssets and getRouteMetaLinks agree on react-and-vue-like css set', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-meta-links-'));
    const routePath = path.join(root, 'routes/react-and-vue@route.tsx');
    await fs.mkdir(path.dirname(routePath), { recursive: true });
    await fs.writeFile(
      path.join(root, 'routes/base-layout.css'),
      '.layout {}',
      'utf-8'
    );
    await fs.writeFile(
      path.join(root, 'routes/counter-common.css'),
      '.counter {}',
      'utf-8'
    );
    await fs.writeFile(
      path.join(root, 'routes/Counter@widget.tsx'),
      "import './counter-common.css';\nexport default function Counter() {}",
      'utf-8'
    );
    await fs.writeFile(
      path.join(root, 'routes/BaseLayout.tsx'),
      "import './base-layout.css';\nexport default function BaseLayout() {}",
      'utf-8'
    );
    await fs.writeFile(
      routePath,
      [
        "import BaseLayout from './BaseLayout.tsx';",
        "import Counter from './Counter@widget.tsx';",
        'export default function Page() {}',
      ].join('\n'),
      'utf-8'
    );

    const assets = await collectRouteModuleAssets(routePath, {
      root,
      extensions: ['.tsx', '.ts', '.css'],
      dynamicImportPredicate: (key: string) => key.includes('@widget.'),
    });

    const manifest = {
      'routes/base-layout.css': {
        file: 'assets/base-layout.css',
        src: 'routes/base-layout.css',
        isEntry: true,
      },
      'routes/Counter@widget.tsx': {
        file: 'assets/counter-widget.js',
        src: 'routes/Counter@widget.tsx',
        css: ['assets/counter-common.css'],
      },
    } as unknown as Manifest;

    const links = getRouteMetaLinks(
      manifest,
      assets,
      base,
      fixtureIncludeDynamicImport
    );
    const hrefs = links.map((link) => link.href ?? '');

    expect(hrefs).toContain(`${base}assets/base-layout.css`);
    expect(hrefs).toContain(`${base}assets/counter-common.css`);
    expect(assets.cssModules).toContain('routes/base-layout.css');
    expect(assets.widgetModules).toContain('routes/Counter@widget.tsx');
  });
});

describe('getLinks dynamicImportPredicate', () => {
  const base = '/';

  test('does not follow convention widget dynamic imports when predicate is omitted', () => {
    const manifest = {
      'routes/page@route.tsx': {
        file: 'assets/page.js',
        src: 'routes/page@route.tsx',
        imports: [],
        dynamicImports: ['routes/Counter@widget.tsx'],
        css: [],
      },
      'routes/Counter@widget.tsx': {
        file: 'assets/counter.js',
        src: 'routes/Counter@widget.tsx',
        css: ['assets/counter.css'],
      },
    } as unknown as Manifest;

    const links = getLinks(manifest, 'routes/page@route.tsx', base, new Set());
    const hrefs = links.map((link) => link.href ?? '');

    expect(hrefs).not.toContain(`${base}assets/counter.css`);
  });
});
