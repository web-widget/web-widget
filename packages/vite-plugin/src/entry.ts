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
  WebRouterUserConfig,
} from './types';

let stage = 0;
const PLACEHOLDER_MODULE = '@web-widget/helpers/placeholder';
const PLACEHOLDER_ID = PLACEHOLDER_MODULE.replaceAll('/', '-');
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
  let serverRoutemapEntryPoints: EntryPoints;
  let ssrBuild: boolean;
  let userConfig: UserConfig;

  async function createConfig(
    config: UserConfig,
    ssr: boolean
  ): Promise<UserConfig> {
    ssrBuild = !!(config.build?.ssr ?? ssr);
    const root = config.root || process.cwd();
    const assetsDir = config.build?.assetsDir ?? 'assets';
    const target = config.ssr?.target ?? 'webworker';
    const serverRoutemapPath = resolvedWebRouterConfig.input.server.routemap;
    const clientImportmap = await api.clientImportmap();
    const serverRoutemap = await api.serverRoutemap();

    serverRoutemapEntryPoints = resolveRoutemapEntryPoints(
      serverRoutemap,
      serverRoutemapPath,
      root
    );

    return {
      root,
      appType: 'custom',
      publicDir: ssrBuild ? (config.publicDir ?? false) : undefined,
      optimizeDeps: {
        exclude: [PLACEHOLDER_MODULE],
      },
      ssr: ssrBuild
        ? {
            external: ['node:async_hooks'],
            noExternal: [PLACEHOLDER_MODULE],
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
        // ssrManifest: ssrBuild
        //   ? undefined
        //   : resolvedWebRouterConfig.output.ssrManifest,
        rollupOptions: {
          input: ssrBuild
            ? {
                ...serverRoutemapEntryPoints,
                [ENTRY_ID]: resolvedWebRouterConfig.input.server.entry,
              }
            : {
                ...serverRoutemapEntryPoints,
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
                entryFileNames: `${assetsDir}/[name]-[hash].js`,
                assetFileNames: `${assetsDir}/[name]-[hash][extname]`,
                chunkFileNames: `${assetsDir}/[name]-[hash].js`,
              },
        },
      },
    };
  }

  const api = {
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
      const { root = process.cwd(), resolve: { extensions } = {} } = config;
      resolvedWebRouterConfig = parseWebRouterConfig(options, root, extensions);
    },

    async configResolved(config) {
      dev = config.command === 'serve';
      base = config.base;
      root = config.root;
    },

    async resolveId(id) {
      if (id === PLACEHOLDER_MODULE) {
        if (!ssrBuild) {
          return this.error(new Error(`Only works on the server side: ${id}`));
        }
        return path.join(root, PLACEHOLDER_ID);
      }
    },

    async load(id) {
      if (id.endsWith(PLACEHOLDER_ID)) {
        return buildPlaceholder(
          root,
          base,
          await api.clientImportmap(),
          await getManifest(root, resolvedWebRouterConfig),
          resolvedWebRouterConfig,
          await api.serverRoutemap(),
          dev
        );
      }
    },
  };

  return [
    entryPlugin,
    {
      name: '@web-widget:entry-assets',
      apply: 'build',
      enforce: 'pre',

      async config(config) {
        userConfig = config;
        return createConfig(config, false);
      },

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
              Reflect.has(serverRoutemapEntryPoints, chunk.name) &&
              serverRoutemapEntryPoints[chunk.name] === chunk.facadeModuleId
            ) {
              chunk.code = 'throw new Error(`Only works on the server side.`);';
            }
          });
        }
      },

      async writeBundle() {
        // TODO Watch module
        stage++;
        if (!ssrBuild && resolvedWebRouterConfig.autoFullBuild) {
          runSsrBuild(await createConfig(userConfig, true));
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

    importActionPlugin(),
  ];
}

type EntryPoints = Record<string, string>;

function resolveRoutemapEntryPoints(
  manifest: RouteMap,
  routemapPath: string,
  root: string
): EntryPoints {
  const entryPoints: EntryPoints = Object.create(null);
  const setEntrypoint = (file: string) => {
    const modulePath = path.resolve(path.dirname(routemapPath), file);
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

    if (entryPoints[basename]) {
      throw new Error('Duplicate entry point: ' + basename);
    }

    entryPoints[basename] = modulePath;
  };

  for (const value of Object.values(manifest)) {
    if (Array.isArray(value)) {
      for (const mod of value) {
        setEntrypoint(mod.module);
      }
    } else {
      setEntrypoint(value.module);
    }
  }

  return entryPoints;
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
  manifest: RouteMap,
  dev: boolean
): string {
  return (
    buildManifest(
      resolvedWebRouterConfig.input.server.routemap,
      manifest,
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
  routemap: string,
  manifest: RouteMap,
  dev: boolean
): string {
  const imports: string[] = Object.entries(manifest).reduce(
    (list, [key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((mod) => {
          list.push(mod.module);
        });
      } else if (value.module) {
        list.push(value.module);
      } else {
        list.push(value);
      }
      return list;
    },
    [] as string[]
  );

  if (dev) {
    const routemapJsonCode = JSON.stringify(
      {
        dev,
        ...manifest,
      },
      null,
      2
    );
    const routemapJsCode = `export const manifest = ${imports.reduce(
      (routemapJsonCode, source) =>
        routemapJsonCode.replaceAll(
          new RegExp(`(\\s*)${escapeRegExp(`"module": "${source}"`)}`, 'g'),
          [
            `$1`,
            `"module": async () => Object.assign({`,
            `  $source: "${path.resolve(path.dirname(routemap), source)}"  `,
            `}, await import("${source}"))`,
          ].join('')
        ),
      routemapJsonCode
    )}`;

    return routemapJsCode;
  } else {
    const routemapJsonCode = JSON.stringify(manifest, null, 2);
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
    return [
      `export const meta = {`,
      // `  link: [{ rel: "dev:placeholder" }],`,
      `  style: [{`,
      `    content: "web-widget{display:contents}"`,
      `  }],`,
      `  script: [{`,
      `    type: "module",`,
      `    src: "${base}${entry}"`,
      `  }]`,
      `}`,
    ].join('\n');
  } else {
    const asset = viteManifest[entry];

    if (!asset) {
      throw new Error(`No client entry found.`);
    }

    const clientImportmapCode = JSON.stringify(clientImportmap);
    const clientEntryModuleName = base + asset.file;
    const clientEntryLink = getLinks(
      viteManifest,
      path.relative(root, resolvedWebRouterConfig.input.client.entry),
      base
    );

    clientEntryLink.push({
      rel: 'modulepreload',
      href: clientEntryModuleName,
    });

    return [
      `export const meta = {`,
      `  link: ${JSON.stringify(clientEntryLink)},`,
      `  style: [{`,
      `    content: "web-widget{display:contents}"`,
      `  }],`,
      `  script: [{`,
      `    type: "importmap",`,
      `    content: JSON.stringify(${clientImportmapCode})`,
      `  }, {`,
      `    type: "module",`,
      `    content: [`,
      `      'const modules = [${JSON.stringify(clientEntryModuleName)}];',`,
      `      'typeof importShim === "function"',`,
      `    '? modules.map(moduleName => importShim(moduleName))',`,
      `    ': modules.map(moduleName => import(moduleName))'`,
      `    ].join("")`,
      `  }]`,
      `}`,
    ].join('\n');
  }
}
