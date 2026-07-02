import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EnvironmentModuleNode, TransformResult } from 'vite';
import { getMeta } from './meta';
import type { ServerDevEnvironment } from '@/internal/environment';

const examplesRoot = path.resolve(
  fileURLToPath(new URL('../../../../examples/react', import.meta.url))
);

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
    name: 'server',
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

interface ModuleSpec {
  path: string;
  type?: EnvironmentModuleNode['type'];
  deps?: string[];
  dynamicDeps?: string[];
  ssrModule?: Record<string, unknown>;
}

/**
 * Builds a connected module graph from specs and returns the lookup functions
 * a `ServerDevEnvironment` needs (`getModulesByFile`, `getModuleById`,
 * `resolveId`). Relative `deps`/`dynamicDeps` are resolved against the parent.
 */
function buildModuleGraph(root: string, specs: ModuleSpec[]) {
  const nodes = new Map<string, EnvironmentModuleNode>();

  for (const spec of specs) {
    const id = path.join(root, spec.path);
    const hasTransform = spec.deps || spec.dynamicDeps;
    nodes.set(
      id,
      createModuleNode({
        id,
        url: id,
        file: id,
        type: spec.type,
        transformResult: hasTransform
          ? ({
              code: '',
              map: null,
              deps: spec.deps ?? [],
              dynamicDeps: spec.dynamicDeps ?? [],
            } as TransformResult)
          : undefined,
        ssrModule: spec.ssrModule,
      })
    );
  }

  for (const spec of specs) {
    const parentId = path.join(root, spec.path);
    const parent = nodes.get(parentId)!;
    for (const dep of [...(spec.deps ?? []), ...(spec.dynamicDeps ?? [])]) {
      const childPath = path.resolve(path.dirname(parentId), dep);
      const child = nodes.get(childPath);
      if (child) {
        parent.importedModules.add(child);
        child.importers.add(parent);
      }
    }
  }

  return {
    getModulesByFile(file: string) {
      const node = nodes.get(file);
      return node ? new Set([node]) : undefined;
    },
    getModuleById(id: string) {
      return nodes.get(id);
    },
    async resolveId(specifier: string, importer: string) {
      if (specifier.startsWith('.')) {
        const resolved = path.resolve(path.dirname(importer), specifier);
        if (nodes.has(resolved)) {
          return { id: resolved };
        }
      }
      return null;
    },
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

  it('collects CSS when the route module id includes a Vite query suffix', async () => {
    const routeModule = createModuleNode({
      id: '/project/routes/style@route.tsx?v=1',
      url: '/project/routes/style@route.tsx?v=1',
      file: '/project/routes/style@route.tsx',
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
              id: '/project/routes/style@route.tsx?v=1',
              url: '/project/routes/style@route.tsx?v=1',
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

    const environment = createMockServerDevEnvironment({
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
        if (id.includes('style@route.tsx')) {
          return routeModule;
        }
        return undefined;
      },
    });

    const meta = await getMeta('/project/routes/style@route.tsx', environment);

    expect(meta.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: '.title{color:red}',
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

  it('skips css from route dynamic imports unless the target matches widgetModuleFilter', async () => {
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

  it('collects css links for examples/react index route from the module graph', async () => {
    const filePath = path.join(examplesRoot, 'routes/examples/index@route.tsx');
    const graph = buildModuleGraph(examplesRoot, [
      {
        path: 'routes/examples/index@route.tsx',
        deps: [
          './index.module.css',
          './(components)/shared.module.css',
          './(components)/Counter@widget.tsx',
          './(components)/BaseLayout.tsx',
        ],
      },
      {
        path: 'routes/examples/index.module.css',
        type: 'css',
      },
      {
        path: 'routes/examples/(components)/shared.module.css',
        type: 'css',
      },
    ]);
    const environment = createMockServerDevEnvironment({
      root: examplesRoot,
      ...graph,
      async importModule() {
        return {};
      },
    });

    const meta = await getMeta(filePath, environment);

    expect(
      meta.link.some((link) => link.href?.includes('index.module.css'))
    ).toBe(true);
  });

  it('adds stylesheet links when css importModule fails', async () => {
    const environment = createMockServerDevEnvironment({
      async importModule(url: string) {
        if (url.endsWith('style.css')) {
          throw new Error('stale module graph');
        }
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
  });

  it('collects widget css when route reaches widgets indirectly via the module graph', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-meta-widget-'));
    const routePath = path.join(root, 'routes/page@route.tsx');
    const graph = buildModuleGraph(root, [
      {
        path: 'routes/page@route.tsx',
        deps: ['./BaseLayout.tsx'],
      },
      {
        path: 'routes/BaseLayout.tsx',
        deps: ['./Counter@widget.tsx'],
      },
      {
        path: 'routes/Counter@widget.tsx',
        deps: ['./counter-common.css'],
      },
      {
        path: 'routes/counter-common.css',
        type: 'css',
      },
    ]);
    const environment = createMockServerDevEnvironment({
      root,
      ...graph,
      async importModule(url: string) {
        if (url.endsWith('counter-common.css')) {
          return { default: '.counter { color: red; }' };
        }
        return {};
      },
    });

    const meta = await getMeta(routePath, environment, (key) =>
      key.includes('@widget.')
    );

    expect(meta.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: '.counter { color: red; }',
        }),
      ])
    );
  });

  it('collects layout and widget css for react-and-vue-like route graph', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-meta-layout-'));
    const routePath = path.join(root, 'routes/react-and-vue@route.tsx');
    const graph = buildModuleGraph(root, [
      {
        path: 'routes/react-and-vue@route.tsx',
        deps: ['./BaseLayout.tsx', './Counter@widget.tsx'],
      },
      {
        path: 'routes/BaseLayout.tsx',
        deps: ['./base-layout.css'],
      },
      {
        path: 'routes/Counter@widget.tsx',
        deps: ['./counter-common.css'],
      },
      {
        path: 'routes/base-layout.css',
        type: 'css',
      },
      {
        path: 'routes/counter-common.css',
        type: 'css',
      },
    ]);
    const environment = createMockServerDevEnvironment({
      root,
      ...graph,
      async importModule(url: string) {
        if (url.endsWith('base-layout.css')) {
          return { default: '.layout { padding: 1rem; }' };
        }
        if (url.endsWith('counter-common.css')) {
          return { default: '.counter { color: red; }' };
        }
        return {};
      },
    });

    const meta = await getMeta(routePath, environment, (key: string) =>
      key.includes('@widget.')
    );

    expect(meta.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: '.layout { padding: 1rem; }',
        }),
        expect.objectContaining({
          content: '.counter { color: red; }',
        }),
      ])
    );
  });

  it('follows widget dynamic imports that are not yet linked in importedModules', async () => {
    const widgetCssModule = createModuleNode({
      id: '/project/routes/counter-common.css',
      url: '/project/routes/counter-common.css',
      type: 'css',
      ssrModule: { default: '.counter { color: red; }' },
      importers: new Set([
        createModuleNode({
          id: '/project/routes/Counter@widget.tsx',
          url: '/project/routes/Counter@widget.tsx',
        }),
      ]),
    });
    const widgetModule = createModuleNode({
      id: '/project/routes/Counter@widget.tsx',
      url: '/project/routes/Counter@widget.tsx',
      transformResult: {
        code: '',
        map: null,
        deps: ['./counter-common.css'],
        dynamicDeps: [],
      } as TransformResult,
      importedModules: new Set([widgetCssModule]),
    });
    const routeModule = createModuleNode({
      id: '/project/routes/page@route.tsx',
      url: '/project/routes/page@route.tsx',
      transformResult: {
        code: '',
        map: null,
        deps: [],
        dynamicDeps: ['./Counter@widget.tsx'],
      } as TransformResult,
      importedModules: new Set(),
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
        if (id.endsWith('Counter@widget.tsx')) {
          return widgetModule;
        }
        if (id.endsWith('counter-common.css')) {
          return widgetCssModule;
        }
        if (id.endsWith('page@route.tsx')) {
          return routeModule;
        }
        return undefined;
      },
      async resolveId(specifier: string) {
        if (specifier.endsWith('Counter@widget.tsx')) {
          return { id: '/project/routes/Counter@widget.tsx' };
        }
        if (specifier.endsWith('counter-common.css')) {
          return { id: '/project/routes/counter-common.css' };
        }
        return null;
      },
      async importModule(url: string) {
        if (url.endsWith('counter-common.css')) {
          return { default: '.counter { color: red; }' };
        }
        return {};
      },
    });

    const meta = await getMeta(
      '/project/routes/page@route.tsx',
      environment,
      (key) => key.includes('@widget.')
    );

    expect(meta.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: '.counter { color: red; }',
        }),
      ])
    );
  });

  it('collects scoped css from vue sfc widget submodules sharing the canonical module key', async () => {
    // Vue SFC widgets emit CSS as a virtual submodule whose id shares the
    // canonical (query-stripped) key with the widget module itself
    // (e.g. `Counter@widget.vue?vue&type=style&...&lang.css`).
    // The crawler must keep both modules distinct so the CSS is not skipped
    // by the visited set.
    const widgetScopedCssId =
      '/project/routes/Counter@widget.vue?vue&type=style&index=0&scoped=a3e69a9a&lang.css';
    const widgetModuleId = '/project/routes/Counter@widget.vue';
    const scopedCssSpecifier =
      './Counter@widget.vue?vue&type=style&index=0&scoped=a3e69a9a&lang.css';

    const widgetScopedCssModule = createModuleNode({
      id: widgetScopedCssId,
      url: widgetScopedCssId,
      type: 'css',
      ssrModule: { default: '.counter[data-v-a3e69a9a]{color:red}' },
      importers: new Set([
        createModuleNode({
          id: widgetModuleId,
          url: widgetModuleId,
        }),
      ]),
    });
    const widgetModule = createModuleNode({
      id: widgetModuleId,
      url: widgetModuleId,
      transformResult: {
        code: '',
        map: null,
        deps: [scopedCssSpecifier],
        dynamicDeps: [],
      } as TransformResult,
      importedModules: new Set([widgetScopedCssModule]),
    });
    const routeModule = createModuleNode({
      id: '/project/routes/page@route.tsx',
      url: '/project/routes/page@route.tsx',
      transformResult: {
        code: '',
        map: null,
        deps: [],
        dynamicDeps: ['./Counter@widget.vue'],
      } as TransformResult,
      importedModules: new Set(),
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
        if (id === widgetModuleId) {
          return widgetModule;
        }
        if (id === widgetScopedCssId) {
          return widgetScopedCssModule;
        }
        if (id.endsWith('page@route.tsx')) {
          return routeModule;
        }
        return undefined;
      },
      async resolveId(specifier: string) {
        if (specifier === scopedCssSpecifier) {
          return { id: widgetScopedCssId };
        }
        if (specifier.endsWith('Counter@widget.vue')) {
          return { id: widgetModuleId };
        }
        return null;
      },
      async importModule(url: string) {
        if (url === widgetScopedCssId) {
          return { default: '.counter[data-v-a3e69a9a]{color:red}' };
        }
        return {};
      },
    });

    const meta = await getMeta(
      '/project/routes/page@route.tsx',
      environment,
      (key) => key.includes('@widget.')
    );

    expect(meta.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: '.counter[data-v-a3e69a9a]{color:red}',
        }),
      ])
    );
  });
});
