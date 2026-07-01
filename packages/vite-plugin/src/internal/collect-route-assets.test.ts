import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from '@jest/globals';
import {
  collectRouteModuleAssets,
  createRouteAssetCaches,
} from './collect-route-assets';

describe('collect-route-assets', () => {
  let tempDir = '';

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  async function writeFixture(structure: Record<string, string>) {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-route-assets-'));
    for (const [relativePath, contents] of Object.entries(structure)) {
      const filePath = path.join(tempDir, relativePath);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, contents, 'utf-8');
    }
    return tempDir;
  }

  /** Resolves relative specifiers (with explicit extensions) against the importer. */
  function relativeResolver(_root: string) {
    return async (
      specifier: string,
      importer: string
    ): Promise<string | null> => {
      if (specifier.startsWith('.')) {
        return path.resolve(path.dirname(importer), specifier);
      }
      return null;
    };
  }

  test('collects route css and widgets without bundling route js', async () => {
    const root = await writeFixture({
      'routes/style.css': 'body { color: red; }',
      'routes/Counter@widget.tsx': 'export default function Counter() {}',
      'routes/BaseLayout.tsx': [
        "import './layout.css';",
        "import Counter from './Counter@widget.tsx';",
        'export default function BaseLayout() {}',
      ].join('\n'),
      'routes/layout.css': '.layout {}',
      'routes/page@route.tsx': [
        "import './style.css';",
        "import BaseLayout from './BaseLayout.tsx';",
        "export const handler = () => new Response('nope');",
        'export default function Page() {}',
      ].join('\n'),
    });

    const assets = await collectRouteModuleAssets(
      path.join(root, 'routes/page@route.tsx'),
      {
        root,
        resolveId: relativeResolver(root),
        dynamicImportPredicate: (key) => key.includes('@widget.'),
      }
    );

    expect(assets.cssModules).toEqual(
      expect.arrayContaining(['routes/style.css', 'routes/layout.css'])
    );
    expect(assets.widgetModules).toEqual(['routes/Counter@widget.tsx']);
  });

  test('match-all import predicate still crawls through non-widget modules for css', async () => {
    const root = await writeFixture({
      'routes/style.css': 'body { color: red; }',
      'routes/Counter@widget.tsx': 'export default function Counter() {}',
      'routes/BaseLayout.tsx': [
        "import './layout.css';",
        "import Counter from './Counter@widget.tsx';",
        'export default function BaseLayout() {}',
      ].join('\n'),
      'routes/layout.css': '.layout {}',
      'routes/page@route.tsx': [
        "import './style.css';",
        "import BaseLayout from './BaseLayout.tsx';",
        'export default function Page() {}',
      ].join('\n'),
    });

    const assets = await collectRouteModuleAssets(
      path.join(root, 'routes/page@route.tsx'),
      {
        root,
        resolveId: relativeResolver(root),
        dynamicImportPredicate: () => true,
      }
    );

    expect(assets.cssModules).toEqual(
      expect.arrayContaining(['routes/style.css', 'routes/layout.css'])
    );
    expect(assets.widgetModules).toEqual(['routes/Counter@widget.tsx']);
  });

  test('excludes convention widgets rejected by import filter from widgetModules', async () => {
    const root = await writeFixture({
      'routes/Included@widget.tsx': 'export default function Included() {}',
      'routes/Excluded@widget.tsx': 'export default function Excluded() {}',
      'routes/BaseLayout.tsx': [
        "import Included from './Included@widget.tsx';",
        "import Excluded from './Excluded@widget.tsx';",
        'export default function BaseLayout() {}',
      ].join('\n'),
      'routes/page@route.tsx': [
        "import BaseLayout from './BaseLayout.tsx';",
        'export default function Page() {}',
      ].join('\n'),
    });

    const assets = await collectRouteModuleAssets(
      path.join(root, 'routes/page@route.tsx'),
      {
        root,
        resolveId: relativeResolver(root),
        dynamicImportPredicate: (key) => key.includes('Included@widget'),
      }
    );

    expect(assets.widgetModules).toEqual(['routes/Included@widget.tsx']);
  });

  test('skips css reached only through dynamic imports on routes', async () => {
    const root = await writeFixture({
      'routes/lazy-chunk.css': '.lazy {}',
      'routes/LazyChunk.tsx': "import './lazy-chunk.css';",
      'routes/page@route.tsx': [
        "void import('./LazyChunk.tsx');",
        'export default function Page() {}',
      ].join('\n'),
    });

    const assets = await collectRouteModuleAssets(
      path.join(root, 'routes/page@route.tsx'),
      {
        root,
        resolveId: relativeResolver(root),
        dynamicImportPredicate: () => false,
      }
    );

    expect(assets.cssModules).not.toContain('routes/lazy-chunk.css');
  });

  test('skips css from React.lazy dynamic imports', async () => {
    const root = await writeFixture({
      'routes/lazy-chunk.css': '.lazy {}',
      'routes/LazyChunk.tsx': "import './lazy-chunk.css';",
      'routes/page@route.tsx': [
        "import { lazy } from 'react';",
        "const Lazy = lazy(() => import('./LazyChunk.tsx'));",
        'export default function Page() { return <Lazy />; }',
      ].join('\n'),
    });

    const assets = await collectRouteModuleAssets(
      path.join(root, 'routes/page@route.tsx'),
      {
        root,
        resolveId: relativeResolver(root),
        dynamicImportPredicate: () => false,
      }
    );

    expect(assets.cssModules).not.toContain('routes/lazy-chunk.css');
  });

  test('still collects statically imported widget modules', async () => {
    const root = await writeFixture({
      'routes/Counter@widget.tsx': 'export default function Counter() {}',
      'routes/page@route.tsx': [
        "import Counter from './Counter@widget.tsx';",
        'export default function Page() { return <Counter />; }',
      ].join('\n'),
    });

    const assets = await collectRouteModuleAssets(
      path.join(root, 'routes/page@route.tsx'),
      {
        root,
        resolveId: relativeResolver(root),
        dynamicImportPredicate: (key) => key.includes('@widget.'),
      }
    );

    expect(assets.widgetModules).toEqual(['routes/Counter@widget.tsx']);
  });

  test('skips directly dynamically imported css files on routes', async () => {
    const root = await writeFixture({
      'routes/lazy.css': '.lazy {}',
      'routes/page@route.tsx': [
        "void import('./lazy.css');",
        'export default function Page() {}',
      ].join('\n'),
    });

    const assets = await collectRouteModuleAssets(
      path.join(root, 'routes/page@route.tsx'),
      {
        root,
        resolveId: relativeResolver(root),
        dynamicImportPredicate: () => false,
      }
    );

    expect(assets.cssModules).toEqual([]);
  });

  test('still collects dynamically imported widget modules on routes', async () => {
    const root = await writeFixture({
      'routes/Counter@widget.tsx': 'export default function Counter() {}',
      'routes/page@route.tsx': [
        "void import('./Counter@widget.tsx');",
        'export default function Page() {}',
      ].join('\n'),
    });

    const assets = await collectRouteModuleAssets(
      path.join(root, 'routes/page@route.tsx'),
      {
        root,
        resolveId: relativeResolver(root),
        dynamicImportPredicate: (key) => key.includes('@widget.'),
      }
    );

    expect(assets.widgetModules).toEqual(['routes/Counter@widget.tsx']);
  });

  test('does not crawl widget sources for nested dynamic css during route collection', async () => {
    const root = await writeFixture({
      'routes/inner-lazy.css': '.inner {}',
      'routes/InnerLazy.tsx': "import './inner-lazy.css';",
      'routes/Panel@widget.tsx': [
        "void import('./InnerLazy.tsx');",
        'export default function Panel() {}',
      ].join('\n'),
      'routes/page@route.tsx': [
        "import Panel from './Panel@widget.tsx';",
        'export default function Page() { return <Panel />; }',
      ].join('\n'),
    });

    const assets = await collectRouteModuleAssets(
      path.join(root, 'routes/page@route.tsx'),
      {
        root,
        resolveId: relativeResolver(root),
        dynamicImportPredicate: (key) => key.includes('@widget.'),
      }
    );

    expect(assets.widgetModules).toEqual(['routes/Panel@widget.tsx']);
    expect(assets.cssModules).not.toContain('routes/inner-lazy.css');
  });

  test('collects layout css and widget css for react-and-vue-like route graph', async () => {
    const root = await writeFixture({
      'routes/base-layout.css': '.layout {}',
      'routes/BaseLayout.tsx': [
        "import './base-layout.css';",
        'export default function BaseLayout({ children }) { return children; }',
      ].join('\n'),
      'routes/counter-common.css': '.counter {}',
      'routes/Counter@widget.tsx': [
        "import './counter-common.css';",
        'export default function Counter() {}',
      ].join('\n'),
      'routes/react-and-vue@route.tsx': [
        "import BaseLayout from './BaseLayout.tsx';",
        "import Counter from './Counter@widget.tsx';",
        'export default function Page() { return <BaseLayout><Counter /></BaseLayout>; }',
      ].join('\n'),
    });

    const assets = await collectRouteModuleAssets(
      path.join(root, 'routes/react-and-vue@route.tsx'),
      {
        root,
        resolveId: relativeResolver(root),
        dynamicImportPredicate: (key: string) => key.includes('@widget.'),
      }
    );

    expect(assets.cssModules).toEqual(
      expect.arrayContaining(['routes/base-layout.css'])
    );
    expect(assets.widgetModules).toEqual(
      expect.arrayContaining(['routes/Counter@widget.tsx'])
    );
  });

  test('collects widgets and css imported via resolve.alias when resolveId is provided', async () => {
    const root = await writeFixture({
      'components/Counter@widget.tsx': 'export default function Counter() {}',
      'components/theme.css': ':root { --c: red; }',
      'components/Layout.tsx': [
        "import './theme.css';",
        'export default function Layout() {}',
      ].join('\n'),
      'routes/page@route.tsx': [
        "import Counter from '~/components/Counter@widget.tsx';",
        "import Layout from '~/components/Layout.tsx';",
        'export default function Page() { return <Layout><Counter /></Layout>; }',
      ].join('\n'),
    });

    const assets = await collectRouteModuleAssets(
      path.join(root, 'routes/page@route.tsx'),
      {
        root,
        resolveId: async (specifier, importer) => {
          if (specifier.startsWith('~/')) {
            return path.join(root, specifier.slice(2));
          }
          if (specifier.startsWith('./') || specifier.startsWith('../')) {
            return path.resolve(path.dirname(importer), specifier);
          }
          return null;
        },
        dynamicImportPredicate: (key: string) => key.includes('@widget.'),
      }
    );

    expect(assets.widgetModules).toEqual(['components/Counter@widget.tsx']);
    expect(assets.cssModules).toEqual(['components/theme.css']);
  });

  test('shared caches reuse read/parse/resolve across routes with common deps', async () => {
    const root = await writeFixture({
      'routes/shared.css': '.shared { color: red; }',
      'routes/Shared.tsx': [
        "import './shared.css';",
        'export default function Shared() {}',
      ].join('\n'),
      'routes/a@route.tsx': [
        "import './Shared.tsx';",
        'export default function PageA() {}',
      ].join('\n'),
      'routes/b@route.tsx': [
        "import './Shared.tsx';",
        'export default function PageB() {}',
      ].join('\n'),
    });

    let resolveCalls = 0;
    const caches = createRouteAssetCaches();
    const countingResolver = async (
      specifier: string,
      importer: string
    ): Promise<string | null> => {
      resolveCalls++;
      if (specifier.startsWith('.')) {
        return path.resolve(path.dirname(importer), specifier);
      }
      return null;
    };

    const options = {
      root,
      resolveId: countingResolver,
      dynamicImportPredicate: () => false,
      caches,
    } as const;

    const assetsA = await collectRouteModuleAssets(
      path.join(root, 'routes/a@route.tsx'),
      options
    );
    const firstCallCount = resolveCalls;

    const assetsB = await collectRouteModuleAssets(
      path.join(root, 'routes/b@route.tsx'),
      options
    );

    // Both routes resolve the shared dependency.
    expect(assetsA.cssModules).toEqual(['routes/shared.css']);
    expect(assetsB.cssModules).toEqual(['routes/shared.css']);

    // Second route must not re-resolve the already-cached `Shared.tsx` imports.
    // Only the new route module itself and its direct edge to `Shared.tsx`
    // need a fresh resolve; the shared module's internal imports are cached.
    expect(resolveCalls).toBeGreaterThan(firstCallCount);
    expect(resolveCalls - firstCallCount).toBeLessThan(firstCallCount);
    // Shared module's own imports are resolved exactly once across both routes.
    expect(caches.source.size).toBe(3);
    expect(caches.parsedImports.size).toBe(3);
  });

  test('does not collect less @import as independent css entry when lexer falls back', async () => {
    // Simulate a Vue SFC: es-module-lexer fails to parse and falls back to regex.
    // The regex must not match Less/CSS `@import` statements.
    const root = await writeFixture({
      'routes/mobile.less': '.mobile { color: red; }',
      'routes/Component.vue': [
        '<template><div></div></template>',
        '<style lang="less">',
        "@import './mobile.less';",
        '@b: ~"component";',
        '.@{b}__main { color: blue; }',
        '</style>',
        '<script>',
        "import { defineComponent } from 'vue';",
        'export default defineComponent({});',
        '</script>',
      ].join('\n'),
      'routes/page@route.tsx': [
        "import Component from './Component.vue';",
        'export default function Page() { return <Component />; }',
      ].join('\n'),
    });

    const assets = await collectRouteModuleAssets(
      path.join(root, 'routes/page@route.tsx'),
      {
        root,
        resolveId: relativeResolver(root),
        dynamicImportPredicate: () => false,
      }
    );

    // mobile.less must not be collected as an independent CSS entry
    expect(assets.cssModules).not.toContain('routes/mobile.less');
  });

  test('does not collect scss @import as independent css entry when lexer falls back', async () => {
    const root = await writeFixture({
      'routes/_variables.scss': '$color: red;',
      'routes/Component.vue': [
        '<template><div></div></template>',
        '<style lang="scss">',
        "@import './_variables.scss';",
        '.main { color: $color; }',
        '</style>',
        '<script>',
        "import { defineComponent } from 'vue';",
        'export default defineComponent({});',
        '</script>',
      ].join('\n'),
      'routes/page@route.tsx': [
        "import Component from './Component.vue';",
        'export default function Page() { return <Component />; }',
      ].join('\n'),
    });

    const assets = await collectRouteModuleAssets(
      path.join(root, 'routes/page@route.tsx'),
      {
        root,
        resolveId: relativeResolver(root),
        dynamicImportPredicate: () => false,
      }
    );

    expect(assets.cssModules).not.toContain('routes/_variables.scss');
  });

  test('does not collect css @import url() as independent css entry when lexer falls back', async () => {
    const root = await writeFixture({
      'routes/base.css': '.base { color: red; }',
      'routes/Component.vue': [
        '<template><div></div></template>',
        '<style>',
        '@import url("./base.css");',
        '.main { color: blue; }',
        '</style>',
        '<script>',
        "import { defineComponent } from 'vue';",
        'export default defineComponent({});',
        '</script>',
      ].join('\n'),
      'routes/page@route.tsx': [
        "import Component from './Component.vue';",
        'export default function Page() { return <Component />; }',
      ].join('\n'),
    });

    const assets = await collectRouteModuleAssets(
      path.join(root, 'routes/page@route.tsx'),
      {
        root,
        resolveId: relativeResolver(root),
        dynamicImportPredicate: () => false,
      }
    );

    expect(assets.cssModules).not.toContain('routes/base.css');
  });

  test('does not collect inline @import in css when lexer falls back', async () => {
    // Verify @import is excluded even when not at line start (preceded by whitespace)
    const root = await writeFixture({
      'routes/base.css': '.base { color: red; }',
      'routes/Component.vue': [
        '<template><div></div></template>',
        '<style>',
        '  @import "./base.css";',
        '.main { color: blue; }',
        '</style>',
        '<script>',
        "import { defineComponent } from 'vue';",
        'export default defineComponent({});',
        '</script>',
      ].join('\n'),
      'routes/page@route.tsx': [
        "import Component from './Component.vue';",
        'export default function Page() { return <Component />; }',
      ].join('\n'),
    });

    const assets = await collectRouteModuleAssets(
      path.join(root, 'routes/page@route.tsx'),
      {
        root,
        resolveId: relativeResolver(root),
        dynamicImportPredicate: () => false,
      }
    );

    expect(assets.cssModules).not.toContain('routes/base.css');
  });

  test('still collects legitimate js imports in various positions when lexer falls back', async () => {
    // Verify the negative lookbehind does not exclude legitimate JS import statements.
    // dep.js imports a CSS file; if dep.js is correctly crawled, the CSS is collected.
    const root = await writeFixture({
      'routes/style.css': '.a { color: red; }',
      'routes/dep.js': "import './style.css';",
      'routes/page@route.tsx': [
        // Line start
        "import './dep.js';",
        // Indented
        "  import './dep.js';",
        // After semicolon
        "const a = 1;import './dep.js';",
        // After opening brace
        "{import './dep.js';}",
        // Dynamic import (after assignment)
        "const x = import('./dep.js');",
        // Awaited dynamic import
        "const y = await import('./dep.js');",
        'export default function Page() { return null; }',
      ].join('\n'),
    });

    const assets = await collectRouteModuleAssets(
      path.join(root, 'routes/page@route.tsx'),
      {
        root,
        resolveId: relativeResolver(root),
        dynamicImportPredicate: () => false,
      }
    );

    // style.css is collected transitively via dep.js, proving the import statements were matched
    expect(assets.cssModules).toContain('routes/style.css');
  });

  test('does not match import substring inside identifiers when lexer falls back', async () => {
    // Verify "import" substrings inside identifiers are not matched as ES imports.
    // style.css exists but is only referenced by string literals, so it must not be collected.
    const root = await writeFixture({
      'routes/style.css': '.a { color: red; }',
      'routes/page@route.tsx': [
        "const myimport = './style.css';",
        "const _import = './style.css';",
        "const $import = './style.css';",
        "function importHelper() { return './style.css'; }",
        'export default function Page() { return null; }',
      ].join('\n'),
    });

    const assets = await collectRouteModuleAssets(
      path.join(root, 'routes/page@route.tsx'),
      {
        root,
        resolveId: relativeResolver(root),
        dynamicImportPredicate: () => false,
      }
    );

    // "import" substrings inside identifiers must not trigger module resolution
    expect(assets.cssModules).toEqual([]);
    expect(assets.widgetModules).toEqual([]);
  });

  test('does not collect imports from comments when lexer falls back', async () => {
    // Verify import statements inside comments are not matched.
    // commented.css exists but is only referenced in comments, so it must not be collected.
    const root = await writeFixture({
      'routes/commented.css': '.a { color: red; }',
      'routes/page@route.tsx': [
        "// import './commented.css';",
        "/* import './commented.css'; */",
        'export default function Page() { return null; }',
      ].join('\n'),
    });

    const assets = await collectRouteModuleAssets(
      path.join(root, 'routes/page@route.tsx'),
      {
        root,
        resolveId: relativeResolver(root),
        dynamicImportPredicate: () => false,
      }
    );

    expect(assets.cssModules).toEqual([]);
    expect(assets.widgetModules).toEqual([]);
  });

  test('does not collect imports from string literals when lexer falls back', async () => {
    // Verify import statements inside string literals are not matched.
    // stringified.css exists but is only referenced inside strings, so it must not be collected.
    const root = await writeFixture({
      'routes/stringified.css': '.a { color: red; }',
      'routes/page@route.tsx': [
        'const code = "import \'./stringified.css\';";',
        "const template = `import './stringified.css';`;",
        'export default function Page() { return null; }',
      ].join('\n'),
    });

    const assets = await collectRouteModuleAssets(
      path.join(root, 'routes/page@route.tsx'),
      {
        root,
        resolveId: relativeResolver(root),
        dynamicImportPredicate: () => false,
      }
    );

    expect(assets.cssModules).toEqual([]);
    expect(assets.widgetModules).toEqual([]);
  });
});
