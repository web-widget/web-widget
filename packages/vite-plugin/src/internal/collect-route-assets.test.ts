import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from '@jest/globals';
import {
  collectRouteModuleAssets,
  collectWidgetCssModules,
  discoverWidgetModulePaths,
  resolveLocalImport,
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
        extensions: ['.tsx', '.ts', '.css'],
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
        extensions: ['.tsx', '.ts', '.css'],
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
        extensions: ['.tsx', '.ts', '.css'],
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
        extensions: ['.tsx', '.ts', '.css'],
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
        extensions: ['.tsx', '.ts', '.css'],
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
        extensions: ['.tsx', '.ts', '.css'],
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
        extensions: ['.tsx', '.ts', '.css'],
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
        extensions: ['.tsx', '.ts', '.css'],
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
        extensions: ['.tsx', '.ts', '.css'],
        dynamicImportPredicate: (key) => key.includes('@widget.'),
      }
    );

    expect(assets.widgetModules).toEqual(['routes/Panel@widget.tsx']);
    expect(assets.cssModules).not.toContain('routes/inner-lazy.css');
  });

  test('discoverWidgetModulePaths uses import filter when provided', async () => {
    const root = await writeFixture({
      'routes/Included@widget.tsx': 'export default function Included() {}',
      'routes/Excluded@widget.tsx': 'export default function Excluded() {}',
      'routes/Custom.widget.tsx': 'export default function Custom() {}',
    });

    const discovered = await discoverWidgetModulePaths(
      root,
      ['routes'],
      (key) => key.endsWith('Custom.widget.tsx')
    );

    expect(discovered).toEqual(['routes/Custom.widget.tsx']);
  });

  test('resolveLocalImport resolves extensionless paths', async () => {
    const root = await writeFixture({
      'routes/style.css': 'body {}',
      'routes/page@route.tsx': "import './style.css';",
    });
    const importer = path.join(root, 'routes/page@route.tsx');

    expect(
      resolveLocalImport('./style.css', importer, root, ['.css', '.tsx'])
    ).toBe(path.join(root, 'routes/style.css'));
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
        extensions: ['.tsx', '.ts', '.css'],
        dynamicImportPredicate: (key: string) => key.includes('@widget.'),
      }
    );

    expect(assets.cssModules).toEqual(
      expect.arrayContaining(['routes/base-layout.css'])
    );
    expect(assets.widgetModules).toEqual(
      expect.arrayContaining(['routes/Counter@widget.tsx'])
    );

    const widgetCssModules = await collectWidgetCssModules(
      path.join(root, 'routes/Counter@widget.tsx'),
      {
        root,
        extensions: ['.tsx', '.ts', '.css'],
      }
    );

    expect(widgetCssModules).toEqual(['routes/counter-common.css']);
  });

  test('collectWidgetCssModules gathers static css from widget sources', async () => {
    const root = await writeFixture({
      'routes/counter-common.css': '.counter {}',
      'routes/Counter@widget.tsx': [
        "import './counter-common.css';",
        'export default function Counter() {}',
      ].join('\n'),
    });

    const cssModules = await collectWidgetCssModules(
      path.join(root, 'routes/Counter@widget.tsx'),
      {
        root,
        extensions: ['.tsx', '.ts', '.css'],
      }
    );

    expect(cssModules).toEqual(['routes/counter-common.css']);
  });
});
