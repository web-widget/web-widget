import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from '@jest/globals';
import { defaultWidgetPathMatcher } from './collect-route-assets';
import {
  entryNameFromModulePath,
  resolveClientEntryPoints,
} from './build-entry-points';

describe('entryNameFromModulePath', () => {
  it('strips file extension from widget module paths', () => {
    const root = path.join('/project', 'examples', 'react');
    const modulePath = path.join(
      root,
      'routes/examples/(components)/Counter@widget.tsx'
    );

    expect(entryNameFromModulePath(modulePath, root)).toBe(
      'examples._components_.Counter@widget'
    );
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
    await fs.writeFile(routemapPath, '{}', 'utf-8');

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

    const { entryPoints } = await resolveClientEntryPoints(
      { routes: [], actions: [], middlewares: [], fallbacks: [] },
      routemapPath,
      tempDir,
      {
        extensions: ['.tsx', '.vue'],
        isWidget: defaultWidgetPathMatcher,
        widgetSearchDirs: ['routes'],
      }
    );

    expect(entryPoints.points['examples._components_.Counter@widget']).toMatch(
      /Counter@widget\.tsx$/
    );
    expect(
      entryPoints.points['examples._components_.Counter@widget.vue']
    ).toMatch(/Counter@widget\.vue$/);
  });

  it('does not promote async route chunk css to client build entries', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-entry-points-'));
    const routemapPath = path.join(tempDir, 'routemap.server.json');
    const cssLazyDir = path.join(tempDir, 'routes/(css-lazy)');
    await fs.mkdir(cssLazyDir, { recursive: true });
    await fs.writeFile(
      routemapPath,
      JSON.stringify({
        routes: [
          {
            pathname: '/css-lazy-dynamic',
            module: './routes/css-lazy-dynamic@route.tsx',
          },
        ],
        actions: [],
        middlewares: [],
        fallbacks: [],
      }),
      'utf-8'
    );
    await fs.writeFile(
      path.join(cssLazyDir, 'lazy-chunk.css'),
      '.css-lazy-dynamic-box {}',
      'utf-8'
    );
    await fs.writeFile(
      path.join(cssLazyDir, 'LazyCssChunk.tsx'),
      "import './lazy-chunk.css';\nexport default function LazyCssChunk() { return null; }",
      'utf-8'
    );
    await fs.writeFile(
      path.join(tempDir, 'routes/css-lazy-dynamic@route.tsx'),
      [
        "import { lazy } from 'react';",
        "const LazyCssChunk = lazy(() => import('./(css-lazy)/LazyCssChunk.tsx'));",
        'export default function Page() { return <LazyCssChunk />; }',
      ].join('\n'),
      'utf-8'
    );

    const { entryPoints, routeClientAssets } = await resolveClientEntryPoints(
      {
        routes: [
          {
            pathname: '/css-lazy-dynamic',
            module: './routes/css-lazy-dynamic@route.tsx',
          },
        ],
        actions: [],
        middlewares: [],
        fallbacks: [],
      },
      routemapPath,
      tempDir,
      {
        extensions: ['.tsx', '.ts', '.css'],
        isWidget: defaultWidgetPathMatcher,
        widgetSearchDirs: ['routes'],
      }
    );

    const routeAssets = routeClientAssets.get(
      'routes/css-lazy-dynamic@route.tsx'
    );
    expect(routeAssets?.cssModules ?? []).not.toContain(
      'routes/(css-lazy)/lazy-chunk.css'
    );
    expect(Object.values(entryPoints.points)).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/lazy-chunk\.css$/)])
    );
  });
});
