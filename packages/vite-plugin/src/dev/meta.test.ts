import type { EnvironmentModuleNode, TransformResult } from 'vite';
import { getMeta } from './meta';
import type { ServerDevEnvironment } from '@/internal/environment';

function createModuleNode(
  partial: Partial<EnvironmentModuleNode> &
    Pick<EnvironmentModuleNode, 'id' | 'url'>
): EnvironmentModuleNode {
  return {
    file: partial.file ?? partial.id,
    importedModules: partial.importedModules ?? new Set(),
    importers: partial.importers ?? new Set(),
    ssrModule: partial.ssrModule ?? null,
    transformResult: partial.transformResult ?? null,
    type: partial.type ?? 'js',
    ...partial,
  } as EnvironmentModuleNode;
}

function createMockServerDevEnvironment(
  overrides: Partial<ServerDevEnvironment> = {}
): ServerDevEnvironment {
  const routeModule = createModuleNode({
    id: '/project/routes/style@route.tsx',
    url: '/project/routes/style@route.tsx',
    transformResult: {
      code: '',
      map: null,
      deps: ['./style.css'],
      dynamicDeps: [],
    } as TransformResult,
    importedModules: new Set([
      createModuleNode({
        id: '/project/routes/style.css',
        url: '/project/routes/style.css',
        type: 'css',
        importers: new Set([
          createModuleNode({
            id: '/project/routes/style@route.tsx',
            url: '/project/routes/style@route.tsx',
          }),
        ]),
      }),
    ]),
  });

  const cssModule = createModuleNode({
    id: '/project/routes/style.css',
    url: '/project/routes/style.css',
    type: 'css',
    ssrModule: { default: '.title{color:red}' },
  });

  return {
    name: 'ssr',
    root: '/project',
    getModulesByFile(file: string) {
      if (file.endsWith('style@route.tsx')) {
        return new Set([routeModule]);
      }
      return undefined;
    },
    getModuleById(id: string) {
      if (id.endsWith('style.css')) {
        return cssModule;
      }
      if (id.endsWith('style@route.tsx')) {
        return routeModule;
      }
      return undefined;
    },
    async transformRequest() {
      return null;
    },
    async resolveId(specifier: string) {
      if (specifier.endsWith('style.css')) {
        return { id: '/project/routes/style.css' };
      }
      return null;
    },
    async importModule(url: string) {
      if (url.endsWith('style.css')) {
        return { default: '.title{color:red}' };
      }
      return {};
    },
    ...overrides,
  };
}

describe('getMeta', () => {
  it('collects inline CSS module content from the server module graph', async () => {
    const meta = await getMeta(
      '/project/routes/style@route.tsx',
      createMockServerDevEnvironment()
    );

    expect(meta.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: '.title{color:red}',
          'data-vite-dev-id': '/project/routes/style.css',
        }),
      ])
    );
    expect(meta.script).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'module',
          src: '/project/routes/style.css',
        }),
      ])
    );
  });

  it('collects external stylesheet URLs when server modules have no inline default export', async () => {
    const environment = createMockServerDevEnvironment({
      async importModule() {
        return {};
      },
    });

    const meta = await getMeta('/project/routes/style@route.tsx', environment);

    expect(meta.link).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rel: 'stylesheet',
          href: '/project/routes/style.css',
        }),
      ])
    );
    expect(meta.style).toHaveLength(0);
  });

  it('skips css from route dynamic imports unless the target matches dynamicImportPredicate', async () => {
    const lazyCssModule = createModuleNode({
      id: '/project/routes/lazy-chunk.css',
      url: '/project/routes/lazy-chunk.css',
      type: 'css',
      importers: new Set([
        createModuleNode({
          id: '/project/routes/LazyChunk.tsx',
          url: '/project/routes/LazyChunk.tsx',
        }),
      ]),
    });
    const lazyChunkModule = createModuleNode({
      id: '/project/routes/LazyChunk.tsx',
      url: '/project/routes/LazyChunk.tsx',
      transformResult: {
        code: '',
        map: null,
        deps: ['./lazy-chunk.css'],
        dynamicDeps: [],
      } as TransformResult,
      importedModules: new Set([lazyCssModule]),
      importers: new Set([
        createModuleNode({
          id: '/project/routes/page@route.tsx',
          url: '/project/routes/page@route.tsx',
        }),
      ]),
    });
    const routeModule = createModuleNode({
      id: '/project/routes/page@route.tsx',
      url: '/project/routes/page@route.tsx',
      transformResult: {
        code: '',
        map: null,
        deps: [],
        dynamicDeps: ['./LazyChunk.tsx'],
      } as TransformResult,
      importedModules: new Set([lazyChunkModule]),
    });

    const environment = createMockServerDevEnvironment({
      root: '/project',
      getModulesByFile(file: string) {
        if (file.endsWith('page@route.tsx')) {
          return new Set([routeModule]);
        }
        return undefined;
      },
      getModuleById(id: string) {
        if (id.endsWith('page@route.tsx')) {
          return routeModule;
        }
        if (id.endsWith('LazyChunk.tsx')) {
          return lazyChunkModule;
        }
        if (id.endsWith('lazy-chunk.css')) {
          return lazyCssModule;
        }
        return undefined;
      },
      async resolveId(specifier: string, importer?: string) {
        if (specifier.endsWith('LazyChunk.tsx')) {
          return { id: '/project/routes/LazyChunk.tsx' };
        }
        if (specifier.endsWith('lazy-chunk.css')) {
          return { id: '/project/routes/lazy-chunk.css' };
        }
        if (specifier.endsWith('style.css')) {
          return { id: '/project/routes/style.css' };
        }
        return null;
      },
      async importModule(url: string) {
        if (url.endsWith('lazy-chunk.css')) {
          return {};
        }
        return {};
      },
    });

    const widgetOnlyPredicate = (key: string) =>
      /^[^?]*[.@]widget\.[^?]*$/.test(key);

    const meta = await getMeta(
      '/project/routes/page@route.tsx',
      environment,
      widgetOnlyPredicate
    );

    expect(meta.link).toEqual([]);
    expect(meta.style).toEqual([]);
    expect(meta.script).toEqual([]);
  });
});
