import path from 'node:path';
import fs from 'node:fs/promises';
import builtins from 'builtin-modules';
import type {
  InlineConfig,
  Plugin,
  UserConfig,
  Manifest as ViteManifest,
} from 'vite';
import { build } from 'vite';
// import { nodeExternals } from 'rollup-plugin-node-externals';
import type {
  VitestEnvironment,
  InlineConfig as VitestInlineConfig,
} from 'vitest/node';
import type { Meta } from '@web-widget/helpers';
import { getLinks, getManifest } from './utils';
import { importActionPlugin } from './import-action';
import { parseWebRouterConfig } from './config';
import { webRouterDevServerPlugin } from './dev';
import { WEB_ROUTER_PLUGIN_NAME } from './constants';
import { generateServerRoutemap } from './v1/routemap';
import type {
  ResolvedWebRouterConfig,
  RouteMap,
  WebRouterPlugin,
  WebRouterPluginApi,
  WebRouterUserConfig,
} from './types';
import { webRouterPreviewServerPlugin } from './preview';

interface VitestUserConfig extends UserConfig {
  /**
   * Options for Vitest
   */
  test?: VitestInlineConfig;
}

let stage = 0;
const PLACEHOLDER_ID = '@placeholder';
const RESOLVED_PLACEHOLDER_ID = '\0' + PLACEHOLDER_ID.replaceAll('/', '-');
const ROUTEMAP_ID = 'virtual:routemap';
const ENTRY_ID = '@entry';
const SERVER_ENTRY_OUTPUT_NAME = 'index';

function runSsrBuild(inlineConfig?: InlineConfig) {
  process.nextTick(() => {
    build(inlineConfig).catch((error) => {
      process.nextTick(() => {
        throw error;
      });
    });
  });
}

type Imports = Record<string, string>;
type Scopes = Record<string, Imports>;
interface ImportMap {
  imports?: Imports;
  scopes?: Scopes;
}

export function entryPlugin(options: WebRouterUserConfig = {}): Plugin[] {
  let root: string;
  let base: string;
  let dev: boolean;
  let resolvedWebRouterConfig: ResolvedWebRouterConfig;
  let serverRoutemapEntryPoints: BuildEntryPoints;
  let ssrBuild: boolean;
  let rawUserConfig: UserConfig;

  async function createConfig(
    config: VitestUserConfig,
    ssr: boolean
  ): Promise<UserConfig> {
    ssrBuild = !!(config.build?.ssr ?? ssr);
    const root = config.root || process.cwd();
    const assetsDir = config.build?.assetsDir ?? 'assets';
    const target = config.ssr?.target ?? 'webworker';

    resolvedWebRouterConfig = parseWebRouterConfig(
      options,
      root,
      config.resolve?.extensions
    );

    const serverRoutemapPath = resolvedWebRouterConfig.input.server.routemap;
    const clientImportmap = await api.clientImportmap();
    const serverRoutemap = await api.serverRoutemap();

    serverRoutemapEntryPoints = resolveRoutemapEntryPoints(
      serverRoutemap,
      serverRoutemapPath,
      root,
      ssrBuild
    );

    const test = config.test;
    const environment: VitestEnvironment =
      test?.environment ?? (target === 'webworker' ? 'edge-runtime' : 'node');

    return {
      root,
      appType: 'custom',
      publicDir: ssrBuild ? (config.publicDir ?? false) : undefined,
      optimizeDeps: {
        exclude: [PLACEHOLDER_ID],
      },
      ssr: ssrBuild
        ? {
            external: ['node:async_hooks'],
            noExternal: [PLACEHOLDER_ID],
            target,
            resolve: {
              // https://github.com/vitejs/vite/issues/6401
              // https://webpack.js.org/guides/package-exports/
              conditions:
                target === 'webworker'
                  ? ['worklet', 'worker', 'import', 'module', 'default']
                  : undefined,
            },
          }
        : undefined,
      build: {
        outDir: path.join(
          resolvedWebRouterConfig.output.dir,
          ssrBuild
            ? resolvedWebRouterConfig.output.server
            : resolvedWebRouterConfig.output.client
        ),
        emptyOutDir: true,
        cssCodeSplit: true,
        manifest: ssrBuild
          ? undefined
          : resolvedWebRouterConfig.output.manifest,
        minify: ssrBuild ? false : (config.build?.minify ?? 'esbuild'),
        ssr: ssrBuild,
        ssrEmitAssets: config.build?.ssrEmitAssets ?? false,
        rollupOptions: {
          input: ssrBuild
            ? {
                ...serverRoutemapEntryPoints.points,
                [ENTRY_ID]: resolvedWebRouterConfig.input.server.entry,
              }
            : {
                ...serverRoutemapEntryPoints.points,
                [ENTRY_ID]: resolvedWebRouterConfig.input.client.entry,
              },
          preserveEntrySignatures: 'exports-only',
          treeshake: config.build?.rollupOptions?.treeshake ?? true,
          external: ssrBuild
            ? (builtins as string[])
            : Object.keys(clientImportmap?.imports ?? []),
          output: ssrBuild
            ? {
                entryFileNames(chunkInfo) {
                  if (
                    resolvedWebRouterConfig.entryFormatVersion === 2 &&
                    chunkInfo.name === ENTRY_ID
                  ) {
                    return `${SERVER_ENTRY_OUTPUT_NAME}.js`;
                  }
                  return `${assetsDir}/[name].js`;
                },
                assetFileNames: `${assetsDir}/[name][extname]`,
                chunkFileNames: `${assetsDir}/[name].js`,
              }
            : {
                //hoistTransitiveImports: false,
                entryFileNames: `${assetsDir}/[name]-[hash].js`,
                assetFileNames: `${assetsDir}/[name]-[hash][extname]`,
                chunkFileNames: `${assetsDir}/[name]-[hash].js`,
              },
        },
      },
      test: test
        ? {
            environment,
            setupFiles:
              environment === 'edge-runtime'
                ? ['@web-widget/vite-plugin/vitest-edge-runtime-environment']
                : environment === 'node'
                  ? ['@web-widget/vite-plugin/vitest-node-environment']
                  : undefined,
          }
        : undefined,
    };
  }

  const api: WebRouterPluginApi = {
    get config() {
      return resolvedWebRouterConfig;
    },
    async clientImportmap() {
      const data = await fs.readFile(
        this.config.input.client.importmap,
        'utf-8'
      );
      return JSON.parse(data) as ImportMap;
    },
    async serverRoutemap() {
      const data = await fs.readFile(
        this.config.input.server.routemap,
        'utf-8'
      );
      return JSON.parse(data) as RouteMap;
    },
  };

  const entryPlugin: WebRouterPlugin = {
    name: WEB_ROUTER_PLUGIN_NAME,
    enforce: 'pre',
    api,

    async config(config) {
      rawUserConfig = config;
      return createConfig(config, false);
    },

    async configResolved(config) {
      dev = config.command === 'serve';
      base = config.base;
      root = config.root;
    },

    async resolveId(id, _importer, options) {
      if (id === PLACEHOLDER_ID) {
        if (!options.ssr) {
          return this.error(new Error(`Only works on the server side: ${id}`));
        }
        return path.join(root, RESOLVED_PLACEHOLDER_ID);
      } else if (id === ROUTEMAP_ID) {
        return resolvedWebRouterConfig.input.server.routemap;
      }
    },

    async load(id) {
      if (id.endsWith(RESOLVED_PLACEHOLDER_ID)) {
        return buildPlaceholder(
          root,
          base,
          await api.clientImportmap(),
          dev ? {} : await getManifest(root, resolvedWebRouterConfig),
          resolvedWebRouterConfig,
          await api.serverRoutemap(),
          dev
        );
      }
    },
  };

  return [
    entryPlugin as Plugin,
    {
      name: '@web-widget:entry-assets',
      apply: 'build',
      enforce: 'pre',

      async configResolved(config) {
        root = config.root;
        base = config.base;
      },

      async generateBundle(_options, bundle) {
        if (ssrBuild) {
          const entryFormatVersion = resolvedWebRouterConfig.entryFormatVersion;
          if (entryFormatVersion === 1) {
            try {
              const viteManifest = await getManifest(
                root,
                resolvedWebRouterConfig
              );
              generateServerRoutemap(
                root,
                base,
                await api.clientImportmap(),
                await api.serverRoutemap(),
                viteManifest,
                resolvedWebRouterConfig,
                bundle
              ).forEach((item) => this.emitFile(item));
            } catch (error) {
              return this.error(error);
            }
            this.emitFile({
              type: 'prebuilt-chunk',
              fileName: 'package.json',
              code: JSON.stringify({ type: 'module' }, null, 2),
            });
          } else if (entryFormatVersion === 2) {
            this.emitFile({
              type: 'prebuilt-chunk',
              fileName: `${SERVER_ENTRY_OUTPUT_NAME}.d.ts`,
              code: [
                `import WebRouter from '@web-widget/web-router';`,
                `declare const _default: WebRouter;`,
                `export default _default;`,
              ].join('\n'),
            });

            this.emitFile({
              type: 'prebuilt-chunk',
              fileName: 'package.json',
              code: JSON.stringify(
                {
                  type: 'module',
                  exports: {
                    '.': {
                      types: `./${SERVER_ENTRY_OUTPUT_NAME}.d.ts`,
                      default: `./${SERVER_ENTRY_OUTPUT_NAME}.js`,
                    },
                  },
                },
                null,
                2
              ),
            });
          }
        } else {
          Object.keys(bundle).forEach((fileName) => {
            const chunk = bundle[fileName];
            const type = chunk.type;
            if (
              type === 'chunk' &&
              chunk.isEntry &&
              Reflect.has(serverRoutemapEntryPoints.points, chunk.name) &&
              serverRoutemapEntryPoints.points[chunk.name] ===
                chunk.facadeModuleId &&
              !serverRoutemapEntryPoints.exposures.has(chunk.name)
            ) {
              // NOTE: Exposing the server module to the client will cause security risks.
              chunk.code = 'throw new Error(`Only works on the server side.`);';
            }
          });
        }
      },

      async writeBundle() {
        // TODO Watch module
        stage++;
        if (!ssrBuild && resolvedWebRouterConfig.autoFullBuild) {
          runSsrBuild(await createConfig(rawUserConfig, true));
          return;
        }

        if (stage === 2) {
          process.nextTick(() => {
            console.info(`@web-widget: build success!`);
          });
        }
      },
    },

    webRouterDevServerPlugin(),
    webRouterPreviewServerPlugin(),
    importActionPlugin(),

    // nodeExternals({
    //   builtins: true,
    //   builtinsPrefix: 'add',
    //   deps: false,
    //   devDeps: false,
    //   peerDeps: false,
    //   optDeps: false,
    // }) as Plugin,
  ];
}

type BuildEntryPoints = {
  points: Record<string, string>;
  exposures: Set<string>;
};

function resolveRoutemapEntryPoints(
  manifest: RouteMap,
  routemapPath: string,
  root: string,
  serverBuild: boolean
): BuildEntryPoints {
  // NOTE: .css or .widget files may be imported by server-side modules.
  const clientTypes: (keyof RouteMap)[] = [
    'routes',
    'actions',
    'fallbacks',
    'layout',
  ];
  const serverTypes: (keyof RouteMap)[] = [
    'routes',
    'actions',
    'middlewares',
    'fallbacks',
    'layout',
  ];
  const temporaryTypes = serverBuild ? [] : ['routes', 'fallbacks', 'layout'];
  const currentTypes = serverBuild ? serverTypes : clientTypes;
  const points: Record<string, string> = Object.create(null);
  const exposures: Set<string> = new Set();
  const add = (type: string, module: string) => {
    const modulePath = path.resolve(path.dirname(routemapPath), module);
    const basename = path
      .relative(
        root,
        modulePath.slice(0, modulePath.length - path.extname(modulePath).length)
      )
      .replace(/^(routes|pages|src|app)[/\\]/g, '')
      // NOTE: Rollup's OutputChunk["name"] object will replace `[` and `]`.
      .replace(/\[|\]/g, '_')
      .split(path.sep)
      .join('-');

    if (points[basename]) {
      throw new Error('Duplicate entry point: ' + basename);
    }

    points[basename] = modulePath;

    if (!temporaryTypes.includes(type)) {
      exposures.add(basename);
    }
  };

  for (const type of currentTypes) {
    const value = manifest[type];
    if (Array.isArray(value)) {
      for (const mod of value) {
        if (typeof mod === 'object' && mod.module) {
          add(type, mod.module);
        }
      }
    } else if (typeof value === 'object' && value.module) {
      add(type, value.module);
    }
  }

  return {
    points,
    exposures,
  };
}

// https://developer.mozilla.org/docs/Web/JavaScript/Guide/Regular_expressions#escaping
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function buildPlaceholder(
  root: string,
  base: string,
  clientImportmap: ImportMap,
  viteManifest: ViteManifest,
  resolvedWebRouterConfig: ResolvedWebRouterConfig,
  routemap: RouteMap,
  dev: boolean
): string {
  return (
    buildManifest(
      root,
      resolvedWebRouterConfig.input.server.routemap,
      routemap,
      dev
    ) +
    '\n' +
    buildMeta(
      root,
      base,
      clientImportmap,
      viteManifest,
      resolvedWebRouterConfig,
      dev
    )
  );
}

function buildManifest(
  root: string,
  file: string,
  routemap: RouteMap,
  dev: boolean
): string {
  if (dev) {
    /* NOTE: Relying on ROUTEMAP_ID here is to allow Vite to update the content when routemap.json changes. */
    const sRoot = JSON.stringify(root);
    const sDirname = JSON.stringify(path.dirname(file));
    const routemapJsCode = `/* @dev:manifest */
      import path from "node:path";
      import importmap from ${JSON.stringify(ROUTEMAP_ID)} assert { type: "json" };
      const createLoader = (item) => {
        const source = item.module;
        if (source) {
          item.module = async () => ({
            $source: "source://" + path.relative(${sRoot}, path.resolve(${sDirname}, source)),
            ...(await import(/* @vite-ignore */ source)),
          });
        }
      };
      const manifest = structuredClone(importmap);
      for (const value of Object.values(manifest)) {
        if (Array.isArray(value)) {
          for (const mod of value) {
            createLoader(mod);
          }
        } else {
          createLoader(value);
        }
      }
      manifest.dev = true;
      export { manifest };`;

    return routemapJsCode;
  } else {
    const imports: string[] = Object.entries(routemap).reduce(
      (list, [key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((mod) => {
            list.push(mod.module);
          });
        } else if (value.module) {
          list.push(value.module);
        }
        return list;
      },
      [] as string[]
    );
    const routemapJsonCode = JSON.stringify(routemap, null, 2);
    const routemapJsCode =
      imports
        .map((module, index) => `import * as _${index} from "${module}";`)
        .join('\n') +
      '\n\n' +
      `export const manifest = ${imports.reduce(
        (routemapJsonCode, source, index) =>
          routemapJsonCode.replaceAll(
            new RegExp(`(\\s*)${escapeRegExp(`"module": "${source}"`)}`, 'g'),
            `$1"module": _${index}`
          ),
        routemapJsonCode
      )}`;

    return routemapJsCode;
  }
}

function buildMeta(
  root: string,
  base: string,
  clientImportmap: ImportMap,
  viteManifest: ViteManifest,
  resolvedWebRouterConfig: ResolvedWebRouterConfig,
  dev: boolean
): string {
  const entry = path.relative(root, resolvedWebRouterConfig.input.client.entry);
  if (dev) {
    const meta: Meta = {
      style: [
        {
          content: 'web-widget{display:contents}',
        },
      ],
      script: [
        {
          type: 'module',
          src: `${base}${entry}`,
        },
      ],
    };
    return `export const meta = ${JSON.stringify(meta, null, 2)};`;
  } else {
    const asset = viteManifest[entry];

    if (!asset) {
      throw new Error(`No client entry found.`);
    }

    const importShim = resolvedWebRouterConfig.importShim;
    const clientImportmapCode = JSON.stringify(clientImportmap);
    const clientEntryModuleName = base + asset.file;
    const clientEntryLinks = getLinks(
      viteManifest,
      path.relative(root, resolvedWebRouterConfig.input.client.entry),
      base
    );

    clientEntryLinks.push({
      rel: 'modulepreload',
      href: clientEntryModuleName,
    });

    // TODO: Encode HTML string in ${variable}.
    const meta: Meta = {
      link: clientEntryLinks,
      style: [
        {
          content: 'web-widget{display:contents}',
        },
      ],
      script: [
        {
          type: 'importmap',
          content: clientImportmapCode,
        },
        ...(importShim.enabled
          ? [
              {
                content: `((o,r,n,s,e,p="loader")=>{n.supports&&n.supports("importmap")||(o[s]=(...n)=>new Promise((n,a)=>{r.head.appendChild(Object.assign(r.createElement("script"),{src:e,crossorigin:"anonymous",async:!0,onload(){o[s][p]?a(Error("["+s+" "+p+"] No "+s+" found: "+e)):n(o[s])},onerror:a}))}).then(o=>o(...n)),o[s][p]=!0)})(self,document,HTMLScriptElement,"importShim",${JSON.stringify(importShim.url)});`,
              },
            ]
          : []),
        {
          type: 'module',
          content: `const m=[${JSON.stringify(clientEntryModuleName)}];typeof importShim==="function"?m.map(n=>importShim(n)):m.map(n=>import(n));`,
        },
      ],
    };

    return `export const meta = ${JSON.stringify(meta, null, 2)};`;
  }
}
