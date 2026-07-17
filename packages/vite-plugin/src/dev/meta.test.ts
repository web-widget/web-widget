import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EnvironmentModuleNode, TransformResult } from 'vite';
import { getDevWidgetStyles, getMeta } from './meta';
import type {
  ClientDevEnvironment,
  ServerDevEnvironment,
} from '@/internal/environment';

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

/**
 * Wraps CSS content in the `const __vite__css = "..."` pattern that the
 * client environment's `vite:css-post` produces. This is what
 * `extractViteCss` parses in `meta.ts`.
 */
function wrapViteCss(css: string): string {
  return [
    'import { updateStyle as __vite__updateStyle } from "/@vite/client"',
    `const __vite__id = "test"`,
    `const __vite__css = ${JSON.stringify(css)}`,
    `__vite__updateStyle(__vite__id, __vite__css)`,
    'export {}',
  ].join('\n');
}

function createMockClientEnvironment(
  cssById: Map<string, string> = new Map(),
  overrides: Partial<ClientDevEnvironment> = {}
): ClientDevEnvironment {
  return {
    root: '/project',
    async transformRequest(url: string) {
      const id = url;
      const css = cssById.get(id);
      if (css !== undefined) {
        return { code: wrapViteCss(css), map: null } as TransformResult;
      }
      return null;
    },
    ...overrides,
  };
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
    async transformRequest(url: string) {
      return null;
    },
    async resolveId(specifier: string) {
      if (specifier.endsWith('style.css')) {
        return { id: '/project/routes/style.css' };
      }
      return null;
    },
    async importModule() {
      return {};
    },
    ...overrides,
  };
}

/** Default client environment matching the default mock module graph (style.css). */
function createDefaultClientEnvironment(): ClientDevEnvironment {
  return createMockClientEnvironment(
    new Map([['/project/routes/style.css', '.title{color:red}']])
  );
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
 * `resolveId`, `importModule`). CSS nodes with `cssContent` populate the
 * returned `clientEnvironment` mock, mirroring how the client environment's
 * `vite:css-post` wraps CSS in `__vite__css`.
 */
function buildModuleGraph(
  root: string,
  specs: (ModuleSpec & { cssContent?: string })[]
) {
  const nodes = new Map<string, EnvironmentModuleNode>();
  const cssById = new Map<string, string>();

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
    if (spec.cssContent !== undefined) {
      cssById.set(id, spec.cssContent);
    }
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

  const clientEnvironment: ClientDevEnvironment = {
    root,
    async transformRequest(url: string) {
      const css = cssById.get(url);
      if (css !== undefined) {
        return { code: wrapViteCss(css), map: null } as TransformResult;
      }
      return null;
    },
  };

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
    async importModule() {
      return {};
    },
    clientEnvironment,
  };
}

describe('getMeta', () => {
  it('collects inline CSS module content from the server module graph', async () => {
    const meta = await getMeta(
      '/project/routes/style@route.tsx',
      createMockServerDevEnvironment(),
      createDefaultClientEnvironment()
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

    const meta = await getMeta(
      '/project/routes/style@route.tsx',
      environment,
      createDefaultClientEnvironment()
    );

    expect(meta.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: '.title{color:red}',
        }),
      ])
    );
  });

  it('emits style with inline CSS content', async () => {
    const environment = createMockServerDevEnvironment();

    const meta = await getMeta(
      '/project/routes/style@route.tsx',
      environment,
      createDefaultClientEnvironment()
    );

    // When CSS content is available from the client environment transform,
    // emit <style> with content + <script> for HMR. This avoids FOUC while
    // keeping HMR working.
    expect(meta.script).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'module',
          src: '/project/routes/style.css',
        }),
      ])
    );
    expect(meta.link).toEqual([]);
    expect(meta.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          'data-vite-dev-id': '/project/routes/style.css',
          content: '.title{color:red}',
        }),
      ])
    );
  });

  it('emits empty style when client environment returns no CSS', async () => {
    const environment = createMockServerDevEnvironment();
    // Client environment returns null for transformRequest
    const clientEnv = createMockClientEnvironment();

    const meta = await getMeta(
      '/project/routes/style@route.tsx',
      environment,
      clientEnv
    );

    // Fallback: emit <script> + empty <style> so HMR can still work
    expect(meta.script).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'module',
          src: '/project/routes/style.css',
        }),
      ])
    );
    expect(meta.link).toEqual([]);
    expect(meta.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          'data-vite-dev-id': '/project/routes/style.css',
          content: '',
        }),
      ])
    );
  });

  it('emits empty style when client transform returns no __vite__css', async () => {
    const environment = createMockServerDevEnvironment();
    // Client returns code without the __vite__css pattern
    const clientEnv: ClientDevEnvironment = {
      root: '/project',
      async transformRequest() {
        return { code: 'export {}', map: null } as TransformResult;
      },
    };

    const meta = await getMeta(
      '/project/routes/style@route.tsx',
      environment,
      clientEnv
    );

    expect(meta.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          'data-vite-dev-id': '/project/routes/style.css',
          content: '',
        }),
      ])
    );
  });

  it('emits empty style when client environment has no entry for module', async () => {
    const environment = createMockServerDevEnvironment();
    const clientEnv = createMockClientEnvironment();

    const meta = await getMeta(
      '/project/routes/style@route.tsx',
      environment,
      clientEnv
    );

    expect(meta.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          'data-vite-dev-id': '/project/routes/style.css',
          content: '',
        }),
      ])
    );
  });

  it('uses client css content for vue sfc style submodules', async () => {
    const vueStyleUrl =
      '/project/routes/Counter@widget.vue?vue&type=style&index=0&scoped=abc123&lang.css';
    const widgetModuleId = '/project/routes/Counter@widget.vue';

    const widgetScopedCssModule = createModuleNode({
      id: vueStyleUrl,
      url: vueStyleUrl,
      type: 'css',
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
        deps: [
          './Counter@widget.vue?vue&type=style&index=0&scoped=abc123&lang.css',
        ],
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
        if (id === widgetModuleId) return widgetModule;
        if (id === vueStyleUrl) return widgetScopedCssModule;
        if (id.endsWith('page@route.tsx')) return routeModule;
        return undefined;
      },
      async resolveId(specifier: string) {
        if (specifier.includes('Counter@widget.vue?vue')) {
          return { id: vueStyleUrl };
        }
        if (specifier.endsWith('Counter@widget.vue')) {
          return { id: widgetModuleId };
        }
        return null;
      },
    });

    const clientEnv = createMockClientEnvironment(
      new Map([[vueStyleUrl, '.counter[data-v-abc123]{color:red}']])
    );

    const meta = await getMeta(
      '/project/routes/page@route.tsx',
      environment,
      clientEnv,
      (key) => key.includes('@widget.')
    );

    // CSS content is extracted from the client environment's __vite__css
    // output. No `?inline` query is needed, so CSS Modules hashes and
    // scoped attributes are preserved.
    expect(meta.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: '.counter[data-v-abc123]{color:red}',
        }),
      ])
    );
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
    });

    const widgetOnlyPredicate = (key: string) =>
      /^[^?]*[.@]widget\.[^?]*$/.test(key);

    const meta = await getMeta(
      '/project/routes/page@route.tsx',
      environment,
      createMockClientEnvironment(),
      widgetOnlyPredicate
    );

    expect(meta.link).toEqual([]);
    expect(meta.style).toEqual([]);
    expect(meta.script).toEqual([]);
  });

  it('collects css links for examples/react index route from the module graph', async () => {
    const filePath = path.join(examplesRoot, 'routes/examples/index@route.tsx');
    const { clientEnvironment, ...graphEnv } = buildModuleGraph(examplesRoot, [
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
      ...graphEnv,
    });

    const meta = await getMeta(filePath, environment, clientEnvironment);

    // CSS modules without client-side CSS content are loaded as
    // `<script type="module">` so Vite's client-side `updateStyle()` can
    // inject and hot-update the CSS.
    expect(
      meta.script.some((script) => script.src?.includes('index.module.css'))
    ).toBe(true);
  });

  it('emits script and empty style when client transform returns null', async () => {
    const environment = createMockServerDevEnvironment();
    // Client environment returns null (module not yet transformed)
    const clientEnv = createMockClientEnvironment();

    const meta = await getMeta(
      '/project/routes/style@route.tsx',
      environment,
      clientEnv
    );

    // CSS module is in the graph but client returns no CSS: emit <script> +
    // empty <style> so the client-side module can load and HMR can work.
    expect(meta.link).toEqual([]);
    expect(meta.script).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'module',
          src: '/project/routes/style.css',
        }),
      ])
    );
    expect(meta.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          'data-vite-dev-id': '/project/routes/style.css',
          content: '',
        }),
      ])
    );
  });

  it('extracts css from client environment transformRequest', async () => {
    // Client environment returns __vite__css-wrapped CSS on transformRequest
    const clientEnv = createMockClientEnvironment(
      new Map([['/project/routes/style.css', '.title{color:red}']])
    );
    const environment = createMockServerDevEnvironment();

    const meta = await getMeta(
      '/project/routes/style@route.tsx',
      environment,
      clientEnv
    );

    // CSS content is extracted from the __vite__css pattern
    expect(meta.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: '.title{color:red}',
          'data-vite-dev-id': '/project/routes/style.css',
        }),
      ])
    );
  });

  it('collects widget css when route reaches widgets indirectly via the module graph', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-meta-widget-'));
    const routePath = path.join(root, 'routes/page@route.tsx');
    const { clientEnvironment, ...graphEnv } = buildModuleGraph(root, [
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
        cssContent: '.counter { color: red; }',
      },
    ]);
    const environment = createMockServerDevEnvironment({
      root,
      ...graphEnv,
    });

    const meta = await getMeta(
      routePath,
      environment,
      clientEnvironment,
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

  it('omits shadow-only widget css from route head metadata', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-meta-shadow-'));
    const routePath = path.join(root, 'routes/page@route.tsx');
    await fs.mkdir(path.dirname(routePath), { recursive: true });
    await Promise.all([
      fs.writeFile(
        routePath,
        "const Counter = container(() => import('./Counter@widget.tsx'));"
      ),
      fs.writeFile(
        path.join(root, 'routes/Counter@widget.tsx'),
        "import './counter.css'; export default function Counter() {}"
      ),
      fs.writeFile(
        path.join(root, 'routes/counter.css'),
        '.counter { color: red; }'
      ),
    ]);

    const { clientEnvironment, ...graphEnv } = buildModuleGraph(root, [
      {
        path: 'routes/page@route.tsx',
        dynamicDeps: ['./Counter@widget.tsx'],
      },
      {
        path: 'routes/Counter@widget.tsx',
        deps: ['./counter.css'],
      },
      {
        path: 'routes/counter.css',
        type: 'css',
        cssContent: '.counter { color: red; }',
      },
    ]);
    const environment = createMockServerDevEnvironment({
      root,
      ...graphEnv,
    });

    const meta = await getMeta(
      routePath,
      environment,
      clientEnvironment,
      (key) => key.includes('@widget.'),
      'shadow'
    );

    expect(meta.style).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ content: '.counter { color: red; }' }),
      ])
    );
  });

  it('collects layout and widget css for react-and-vue-like route graph', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-meta-layout-'));
    const routePath = path.join(root, 'routes/react-and-vue@route.tsx');
    const { clientEnvironment, ...graphEnv } = buildModuleGraph(root, [
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
        cssContent: '.layout { padding: 1rem; }',
      },
      {
        path: 'routes/counter-common.css',
        type: 'css',
        cssContent: '.counter { color: red; }',
      },
    ]);
    const environment = createMockServerDevEnvironment({
      root,
      ...graphEnv,
    });

    const meta = await getMeta(
      routePath,
      environment,
      clientEnvironment,
      (key: string) => key.includes('@widget.')
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
    });

    const clientEnv = createMockClientEnvironment(
      new Map([
        ['/project/routes/counter-common.css', '.counter { color: red; }'],
      ])
    );

    const meta = await getMeta(
      '/project/routes/page@route.tsx',
      environment,
      clientEnv,
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
    // (e.g. `Counter@widget.vue?vue&type=style&index=0&scoped=a3e69a9a&lang.css`).
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
    });

    const clientEnv = createMockClientEnvironment(
      new Map([[widgetScopedCssId, '.counter[data-v-a3e69a9a]{color:red}']])
    );

    const meta = await getMeta(
      '/project/routes/page@route.tsx',
      environment,
      clientEnv,
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

  it('collects a vue sfc style submodule when the widget is the graph root', async () => {
    const widgetModuleId = '/project/routes/Counter@widget.vue';
    const widgetStyleId =
      '/project/routes/Counter@widget.vue?vue&type=style&index=0&lang.module.css';
    const widgetStyle = createModuleNode({
      file: widgetModuleId,
      id: widgetStyleId,
      type: 'css',
      url: widgetStyleId,
    });
    const widgetModule = createModuleNode({
      file: widgetModuleId,
      id: widgetModuleId,
      importedModules: new Set([widgetStyle]),
      url: widgetModuleId,
    });
    const environment = createMockServerDevEnvironment({
      root: '/project',
      getModulesByFile(file: string) {
        return file === widgetModuleId
          ? new Set([widgetModule, widgetStyle])
          : undefined;
      },
      getModuleById(id: string) {
        if (id === widgetModuleId) return widgetModule;
        if (id === widgetStyleId) return widgetStyle;
        return undefined;
      },
    });
    const clientEnv = createMockClientEnvironment(
      new Map([[widgetStyleId, '._box_hash{color:red}']])
    );

    const styles = await getDevWidgetStyles(
      widgetModuleId,
      environment,
      clientEnv
    );

    expect(styles).toEqual([
      { id: widgetStyleId, content: '._box_hash{color:red}' },
    ]);
  });
});
