import path from 'node:path';
import fs from 'node:fs/promises';
import builtins from 'builtin-modules';
import type { ConfigEnv, InlineConfig, Plugin, UserConfig } from 'vite';
import { build } from 'vite';
// import { nodeExternals } from 'rollup-plugin-node-externals';
import type {
  VitestEnvironment,
  InlineConfig as VitestInlineConfig,
} from 'vitest/node';
import type { Meta, RouteModule } from '@web-widget/helpers';
import { escapeRegExp, getLinks, getManifest, normalizePath } from './utils';
import { importActionPlugin } from './import-action';
import { parseWebRouterConfig } from './config';
import { webRouterDevServerPlugin } from './dev';
import { SOURCE_PROTOCOL, WEB_ROUTER_PLUGIN_NAME } from './constants';
import type {
  ResolvedWebRouterConfig,
  RouteMap,
  WebRouterPlugin,
  WebRouterPluginApi,
  WebRouterUserConfig,
} from './types';
import { webRouterPreviewServerPlugin } from './preview';
import { removeExportsPlugin } from './remove-exports';
import { LayoutModule } from '@web-widget/web-router';
import MagicString from 'magic-string';

interface VitestUserConfig extends UserConfig {
  /**
   * Options for Vitest
   */
  test?: VitestInlineConfig;
}

let stage = 0;
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
  let sourcemap: boolean;
  let resolvedWebRouterConfig: ResolvedWebRouterConfig;
  let serverRoutemapEntryPoints: BuildEntryPoints;
  let ssrBuild: boolean;
  let rawUserConfig: UserConfig;
  let rawUserConfigEnv: ConfigEnv;

  async function createConfig(
    config: VitestUserConfig,
    env: ConfigEnv
  ): Promise<VitestUserConfig> {
    ssrBuild = !!env.isSsrBuild;
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
      mode: env.mode,
      appType: 'custom',
      publicDir: ssrBuild ? (config.publicDir ?? false) : undefined,
      optimizeDeps: {
        exclude: [],
      },
      ssr: ssrBuild
        ? {
            external: ['node:async_hooks'],
            noExternal: [],
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
          preserveEntrySignatures: 'allow-extension',
          treeshake: config.build?.rollupOptions?.treeshake ?? true,
          external: ssrBuild
            ? (builtins as string[])
            : Object.keys(clientImportmap?.imports ?? []),
          output: {
            // NOTE: The `preserveModules` option causes build artifacts to reference
            // external modules using relative paths, rather than bare module names.
            // preserveModules: true,
            ...(ssrBuild
              ? {
                  entryFileNames(chunkInfo) {
                    if (chunkInfo.name === ENTRY_ID) {
                      return `${SERVER_ENTRY_OUTPUT_NAME}.js`;
                    }
                    return `${assetsDir}/[name].js`;
                  },
                  assetFileNames: `${assetsDir}/[name][extname]`,
                  chunkFileNames: `${assetsDir}/[name].js`,
                }
              : {
                  entryFileNames: `${assetsDir}/[name]-[hash].js`,
                  assetFileNames: `${assetsDir}/[name]-[hash][extname]`,
                  chunkFileNames: `${assetsDir}/[name]-[hash].js`,
                }),
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
      const file = this.config.input.client.importmap;
      const data = await fs.readFile(file, 'utf-8');
      try {
        return JSON.parse(data) as ImportMap;
      } catch (error) {
        throw new Error(`Failed to parse client importmap: ${file}`);
      }
    },
    async serverRoutemap() {
      const file = resolvedWebRouterConfig.input.server.routemap;
      const data = await fs.readFile(file, 'utf-8');
      try {
        return JSON.parse(data) as RouteMap;
      } catch (error) {
        throw new Error(`Failed to parse server routemap: ${file}`);
      }
    },
  };

  const entryPlugin: WebRouterPlugin = {
    name: WEB_ROUTER_PLUGIN_NAME,
    enforce: 'pre',
    api,

    async config(config, env) {
      rawUserConfig = config;
      rawUserConfigEnv = env;
      return createConfig(config, env);
    },

    async configResolved(config) {
      dev = config.command === 'serve';
      base = config.base;
      root = config.root;
      sourcemap = !!config.build?.sourcemap;
    },

    /**
     * Input:
     *
     * const { meta, manifest } = import.meta.framework;
     *
     * Becomes:
     *
     * const __import_meta_framework__ = {};
     * __import_meta_framework__.meta = { ... };
     * __import_meta_framework__.manifest = { ... };
     * const { meta, manifest } = __import_meta_framework__;
     */
    async transform(code, id, { ssr } = {}) {
      const { entry, routemap } = resolvedWebRouterConfig.input.server;
      const PLACEHOLDER = 'import.meta.framework';
      if (id !== entry || !ssr || !code.includes(PLACEHOLDER)) {
        return null;
      }

      const magicString = new MagicString(code);
      const FRAMEWORK = '__import_meta_framework__';
      let manifestCode: string;
      let metaCode: string;

      if (dev) {
        manifestCode = `
          import importmap from ${JSON.stringify(routemap)} assert { type: "json" };
          ${FRAMEWORK}.manifest = (() => {
            const createLoader = (item) => {
              const source = item.module;
              if (source) {
                item.module = async () => ({
                  $source: "${SOURCE_PROTOCOL}//" + source,
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
            return manifest;
          })();
          `;
      } else {
        const routemapJson = await api.serverRoutemap();
        const imports: string[] = Object.entries(routemapJson).reduce(
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
        const routemapJsonCode = JSON.stringify(routemapJson, null, 2);
        manifestCode =
          imports
            .map((module, index) => `import * as _${index} from "${module}";`)
            .join('\n') +
          '\n\n' +
          `${FRAMEWORK}.manifest = ${imports.reduce(
            (routemapJsonCode, source, index) =>
              routemapJsonCode.replaceAll(
                new RegExp(
                  `(\\s*)${escapeRegExp(`"module": "${source}"`)}`,
                  'g'
                ),
                `$1"module": _${index}`
              ),
            routemapJsonCode
          )}`;
      }

      const entryFileName = normalizePath(
        path.relative(root, resolvedWebRouterConfig.input.client.entry)
      );

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
              // NOTE: Vite DevServer will add base to the output HTML
              // src: `${base}${entryFileName}`,
              src: entryFileName,
            },
          ],
        };
        metaCode = `${FRAMEWORK}.meta = ${JSON.stringify(meta, null, 2)};`;
      } else {
        const clientImportmap = await api.clientImportmap();
        const viteManifest = await getManifest(root, resolvedWebRouterConfig);
        const asset = viteManifest[entryFileName];

        if (!asset) {
          throw new Error(`No client entry found.`);
        }

        const importShim = resolvedWebRouterConfig.importShim;
        const clientEntryModuleName = base + asset.file;
        const clientEntryLinks = getLinks(viteManifest, entryFileName, base);
        const importmapScripts: Meta['script'] = [];

        clientEntryLinks.push({
          rel: 'modulepreload',
          href: clientEntryModuleName,
        });

        if (clientImportmap) {
          importmapScripts.push({
            type: 'importmap',
            content: JSON.stringify(clientImportmap),
          });

          if (importShim.enabled) {
            importmapScripts.push({
              content: `((o,r,n,s,e,p="loader")=>{n.supports&&n.supports("importmap")||(o[s]=(...n)=>new Promise((n,a)=>{r.head.appendChild(Object.assign(r.createElement("script"),{src:e,crossorigin:"anonymous",async:!0,onload(){o[s][p]?a(Error("["+s+" "+p+"] No "+s+" found: "+e)):n(o[s])},onerror:a}))}).then(o=>o(...n)),o[s][p]=!0)})(self,document,HTMLScriptElement,"importShim",${JSON.stringify(importShim.url)});`,
            });
          }
        }

        const meta: Meta = {
          link: clientEntryLinks,
          style: [
            {
              content: 'web-widget{display:contents}',
            },
          ],
          script: [
            ...importmapScripts,
            {
              type: 'module',
              content: `const m=[${JSON.stringify(clientEntryModuleName)}];typeof importShim==="function"?m.map(n=>importShim(n)):m.map(n=>import(n));`,
            },
          ],
        };

        metaCode = `${FRAMEWORK}.meta = ${JSON.stringify(meta, null, 2)};`;
      }

      magicString.prepend(`const ${FRAMEWORK} = {};
        ${manifestCode}
        ${metaCode}
        `);

      magicString.replaceAll(PLACEHOLDER, FRAMEWORK);

      return {
        code: magicString.toString(),
        map: sourcemap ? magicString.generateMap() : null,
      };
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
        } else {
          Object.keys(bundle).forEach((fileName) => {
            const chunk = bundle[fileName];
            const type = chunk.type;
            const name = chunk.name ? normalizePath(chunk.name) : '';
            if (
              type === 'chunk' &&
              chunk.isEntry &&
              Reflect.has(serverRoutemapEntryPoints.points, name) &&
              serverRoutemapEntryPoints.points[name] === chunk.facadeModuleId &&
              !serverRoutemapEntryPoints.exposures.has(name)
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
          runSsrBuild(
            await createConfig(rawUserConfig, {
              ...rawUserConfigEnv,
              isSsrBuild: true,
            })
          );
          return;
        }

        if (stage === 2) {
          process.nextTick(() => {
            console.info(`@web-widget: build success!`);
          });
        }
      },
    },

    {
      name: '@web-widget:remove-async-hooks',
      enforce: 'pre',

      async resolveId(id) {
        if (id === 'node:async_hooks') {
          return resolvedWebRouterConfig.asyncContext.enabled ? false : id;
        }
        return null;
      },

      async load(id) {
        if (id === 'node:async_hooks') {
          return resolvedWebRouterConfig.asyncContext.enabled
            ? null
            : 'export const AsyncLocalStorage = undefined';
        }
        return null;
      },
    },

    webRouterDevServerPlugin(),
    webRouterPreviewServerPlugin(),
    importActionPlugin(),

    // NOTE: Although the routing module does not run on the client,
    // it needs to be built on the client to get the css file.
    // However, the routing module may introduce server-specific modules,
    // so the server-specific exports need to be deleted.
    removeExportsPlugin({
      target: ['handler', 'config'] as (
        | keyof RouteModule
        | keyof LayoutModule
      )[],
      only: 'client',
      include: /[.@](route|layout)\..*$/,
    }),

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
    const basename = normalizePath(
      path
        .relative(
          root,
          modulePath.slice(
            0,
            modulePath.length - path.extname(modulePath).length
          )
        )
        .replace(/^(routes|pages|src|app)[/\\]/g, '')
        .split(path.sep)
        .join('.')
        // NOTE: Rollup's OutputChunk["name"] object will replace `[` and `]`.
        .replace(/[^a-zA-Z0-9@_.-]+/g, '_')
    );

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
