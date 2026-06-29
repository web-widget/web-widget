import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from '@jest/globals';
import {
  assetBaseNameFromModuleId,
  collapseIndexPathSegments,
  entryNameFromModulePath,
  resolveClientEntryPoints,
} from './build-entry-points';

describe('collapseIndexPathSegments', () => {
  it('collapses directory index route modules onto their parent segment', () => {
    expect(
      collapseIndexPathSegments(['examples', 'action', 'index@route'])
    ).toEqual(['examples', 'action@route']);
    expect(collapseIndexPathSegments(['index@route'])).toEqual(['_root@route']);
    expect(
      collapseIndexPathSegments(['examples', 'static', 'index.module'])
    ).toEqual(['examples', 'static.module']);
  });

  it('recursively collapses nested index directories', () => {
    expect(collapseIndexPathSegments(['foo', 'index', 'index@route'])).toEqual([
      'foo@route',
    ]);
  });
});

describe('entryNameFromModulePath', () => {
  const root = path.join('/project', 'examples', 'react');

  it('strips file extension from widget module paths', () => {
    const modulePath = path.join(
      root,
      'routes/examples/(components)/Counter@widget.tsx'
    );

    expect(entryNameFromModulePath(modulePath, root)).toBe(
      'examples._components_.Counter@widget.tsx'
    );
  });

  it('disambiguates @widget modules by file extension', () => {
    const vuePath = path.join(
      root,
      'routes/examples/(components)/Counter@widget.vue'
    );
    expect(entryNameFromModulePath(vuePath, root)).toBe(
      'examples._components_.Counter@widget.vue'
    );
  });

  it('maps index route modules to parent directory names', () => {
    expect(
      entryNameFromModulePath(path.join(root, 'routes/index@route.tsx'), root)
    ).toBe('_root@route');
    expect(
      entryNameFromModulePath(
        path.join(root, 'routes/examples/action/index@route.tsx'),
        root
      )
    ).toBe('examples.action@route');
    expect(
      entryNameFromModulePath(
        path.join(root, 'routes/examples/static/index.module.css'),
        root
      )
    ).toBe('examples.static.module');
  });

  it('resolves build chunk names from absolute module ids', () => {
    const modulePath = path.join(root, 'routes/examples/fetch/index@route.tsx');
    expect(assetBaseNameFromModuleId(modulePath, root)).toBe(
      'examples.fetch@route'
    );
    expect(assetBaseNameFromModuleId(`${modulePath}?v=1`, root)).toBe(
      'examples.fetch@route'
    );
    expect(
      assetBaseNameFromModuleId('/outside/route.ts', root)
    ).toBeUndefined();
  });
});

describe('resolveClientEntryPoints', () => {
  let tempDir = '';

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  it('disambiguates widget entries that share the same basename', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-entry-points-'));
    const routemapPath = path.join(tempDir, 'routemap.server.json');

    const widgetDir = path.join(tempDir, 'routes/examples/(components)');
    await fs.mkdir(widgetDir, { recursive: true });
    await fs.writeFile(
      path.join(widgetDir, 'Counter@widget.tsx'),
      'export default function Counter() { return null; }',
      'utf-8'
    );
    await fs.writeFile(
      path.join(widgetDir, 'Counter@widget.vue'),
      '<template><div /></template>',
      'utf-8'
    );

    const manifest = {
      routes: [
        {
          pathname: '/examples',
          module: './routes/examples/index@route.tsx',
        },
      ],
      actions: [],
      middlewares: [],
      fallbacks: [],
    };
    await fs.writeFile(routemapPath, JSON.stringify(manifest), 'utf-8');

    const entryPoints = await resolveClientEntryPoints(
      manifest,
      routemapPath,
      tempDir,
      {}
    );

    expect(
      entryPoints.points['examples._components_.Counter@widget.tsx']
    ).toMatch(/Counter@widget\.tsx$/);
    expect(
      entryPoints.points['examples._components_.Counter@widget.vue']
    ).toMatch(/Counter@widget\.vue$/);
  });

  it('excludes widgets rejected by dynamicImportPredicate from client build entries', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-entry-points-'));
    const routemapPath = path.join(tempDir, 'routemap.server.json');
    await fs.writeFile(
      routemapPath,
      JSON.stringify({
        routes: [
          {
            pathname: '/',
            module: './routes/page@route.tsx',
          },
        ],
        actions: [],
        middlewares: [],
        fallbacks: [],
      }),
      'utf-8'
    );
    await fs.mkdir(path.join(tempDir, 'routes'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'routes/Included@widget.tsx'),
      'export default function Included() {}',
      'utf-8'
    );
    await fs.writeFile(
      path.join(tempDir, 'routes/Excluded@widget.tsx'),
      'export default function Excluded() {}',
      'utf-8'
    );
    await fs.writeFile(
      path.join(tempDir, 'routes/page@route.tsx'),
      [
        "import Included from './Included@widget.tsx';",
        'export default function Page() { return <Included />; }',
      ].join('\n'),
      'utf-8'
    );

    const dynamicImportPredicate = (key: string) =>
      key.includes('Included@widget');

    const entryPoints = await resolveClientEntryPoints(
      {
        routes: [
          {
            pathname: '/',
            module: './routes/page@route.tsx',
          },
        ],
        actions: [],
        middlewares: [],
        fallbacks: [],
      },
      routemapPath,
      tempDir,
      {
        dynamicImportPredicate,
      }
    );

    expect(Object.values(entryPoints.points)).toEqual(
      expect.arrayContaining([expect.stringMatching(/Included@widget\.tsx$/)])
    );
    expect(Object.values(entryPoints.points)).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/Excluded@widget\.tsx$/)])
    );
  });

  it('excludes widgets reached via layout chain when filter rejects them', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-entry-points-'));
    const routemapPath = path.join(tempDir, 'routemap.server.json');
    await fs.writeFile(
      routemapPath,
      JSON.stringify({
        routes: [
          {
            pathname: '/',
            module: './routes/page@route.tsx',
          },
        ],
        actions: [],
        middlewares: [],
        fallbacks: [],
      }),
      'utf-8'
    );
    await fs.mkdir(path.join(tempDir, 'routes'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'routes/Included@widget.tsx'),
      'export default function Included() {}',
      'utf-8'
    );
    await fs.writeFile(
      path.join(tempDir, 'routes/Excluded@widget.tsx'),
      'export default function Excluded() {}',
      'utf-8'
    );
    await fs.writeFile(
      path.join(tempDir, 'routes/BaseLayout.tsx'),
      [
        "import Included from './Included@widget.tsx';",
        "import Excluded from './Excluded@widget.tsx';",
        'export default function BaseLayout() {}',
      ].join('\n'),
      'utf-8'
    );
    await fs.writeFile(
      path.join(tempDir, 'routes/page@route.tsx'),
      [
        "import BaseLayout from './BaseLayout.tsx';",
        'export default function Page() { return <BaseLayout />; }',
      ].join('\n'),
      'utf-8'
    );

    const dynamicImportPredicate = (key: string) =>
      key.includes('Included@widget');

    const entryPoints = await resolveClientEntryPoints(
      {
        routes: [
          {
            pathname: '/',
            module: './routes/page@route.tsx',
          },
        ],
        actions: [],
        middlewares: [],
        fallbacks: [],
      },
      routemapPath,
      tempDir,
      {
        dynamicImportPredicate,
      }
    );

    expect(Object.values(entryPoints.points)).toEqual(
      expect.arrayContaining([expect.stringMatching(/Included@widget\.tsx$/)])
    );
    expect(Object.values(entryPoints.points)).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/Excluded@widget\.tsx$/)])
    );
  });
});
