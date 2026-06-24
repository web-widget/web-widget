import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from '@jest/globals';
import {
  collectRouteModuleAssets,
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
        isWidget: (relativePath) => relativePath.includes('@widget.'),
      }
    );

    expect(assets.cssModules).toEqual(
      expect.arrayContaining(['routes/style.css', 'routes/layout.css'])
    );
    expect(assets.widgetModules).toEqual(['routes/Counter@widget.tsx']);
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
        isWidget: () => false,
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
        isWidget: () => false,
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
        isWidget: (relativePath) => relativePath.includes('@widget.'),
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
        isWidget: () => false,
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
        isWidget: (relativePath) => relativePath.includes('@widget.'),
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
        isWidget: (relativePath) => relativePath.includes('@widget.'),
      }
    );

    expect(assets.widgetModules).toEqual(['routes/Panel@widget.tsx']);
    expect(assets.cssModules).not.toContain('routes/inner-lazy.css');
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
});
