import path from 'node:path';
import builtins from 'builtin-modules';
import type { EmittedFile, OutputBundle, OutputChunk } from 'rollup';
import type {
  InlineConfig,
  Plugin,
  UserConfig,
  Manifest as ViteManifest,
} from 'vite';
import { build, normalizePath } from 'vite';
import { getLinks, getManifest } from './utils';
import { importActionPlugin } from './import-action';
import { parseWebRouterConfig } from './config';
import { webRouterDevServerPlugin } from './dev';
import { WEB_ROUTER_PLUGIN_NAME } from './constants';
import type {
  ResolvedWebRouterConfig,
  RouteMap,
  WebRouterPlugin,
  WebRouterUserConfig,
} from './types';

let stage = 0;

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
type ImportMap = {
  imports?: Imports;
  scopes?: Scopes;
};

export function entryPlugin(options: WebRouterUserConfig = {}): Plugin[] {
  let root: string;
  let base: string;
  let resolvedWebRouterConfig: ResolvedWebRouterConfig;
  let serverRoutemapEntryPoints: EntryPoints;
  let ssrBuild: boolean;
  let userConfig: UserConfig;

  async function createConfig(
    config: UserConfig,
    ssr?: boolean
  ): Promise<UserConfig> {
    ssrBuild = !!(config.build?.ssr ?? ssr);
    const root = config.root || process.cwd();
    const assetsDir = config.build?.assetsDir ?? 'assets';
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
      publicDir: ssrBuild ? config.publicDir ?? false : undefined,
      ssr: ssrBuild
        ? {
            external: ['node:async_hooks'],
            noExternal:
              config.ssr?.noExternal ??
              (config.ssr?.target === 'node' ? undefined : true),
            target: config.ssr?.target ?? 'webworker',
          }
        : undefined,
      resolve: ssrBuild
        ? {
            // https://github.com/vitejs/vite/issues/6401
            // https://webpack.js.org/guides/package-exports/
            conditions:
              config.resolve?.conditions ??
              (config.ssr?.target === 'node'
                ? undefined
                : ['worklet', 'worker', 'import', 'module', 'default']),
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
        minify: ssrBuild ? false : config.build?.minify ?? 'esbuild',
        ssr: ssrBuild,
        ssrEmitAssets: config.build?.ssrEmitAssets ?? false,
        // ssrManifest: ssrBuild
        //   ? undefined
        //   : resolvedWebRouterConfig.output.ssrManifest,
        rollupOptions: {
          input: ssrBuild
            ? {
                ...serverRoutemapEntryPoints,
                entry: resolvedWebRouterConfig.input.server.entry,
              }
            : {
                ...serverRoutemapEntryPoints,
                entry: resolvedWebRouterConfig.input.client.entry,
              },
          preserveEntrySignatures: 'allow-extension', // "strict",
          treeshake: config.build?.rollupOptions?.treeshake ?? true,
          external: ssrBuild
            ? (builtins as string[])
            : Object.keys(clientImportmap?.imports ?? []),
          output: ssrBuild
            ? {
                entryFileNames: `${assetsDir}/[name].js`,
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
      return (
        await import(this.config.input.client.importmap, {
          assert: {
            type: 'json',
          },
        })
      ).default as ImportMap;
    },
    async serverRoutemap() {
      return (
        await import(this.config.input.server.routemap, {
          assert: {
            type: 'json',
          },
        })
      ).default as RouteMap;
    },
  };

  return [
    {
      name: WEB_ROUTER_PLUGIN_NAME,
      enforce: 'pre',
      api,
      async config(config) {
        const { root = process.cwd(), resolve: { extensions } = {} } = config;
        resolvedWebRouterConfig = parseWebRouterConfig(
          options,
          root,
          extensions
        );
      },
    } as WebRouterPlugin,
    {
      name: '@web-widget:entry',
      apply: 'build',
      enforce: 'pre',

      api,

      async config(config) {
        userConfig = config;
        return createConfig(config);
      },

      async configResolved(config) {
        root = config.root;
        base = config.base;
      },

      async generateBundle(_options, bundle) {
        if (ssrBuild) {
          const viteManifest = await getManifest(root, resolvedWebRouterConfig);

          try {
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
  const entryPoints: EntryPoints = {};
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

function generateServerRoutemap(
  root: string,
  base: string,
  clientImportmap: ImportMap,
  manifest: RouteMap,
  viteManifest: ViteManifest,
  resolvedWebRouterConfig: ResolvedWebRouterConfig,
  bundle: OutputBundle
): EmittedFile[] {
  function getChunkName(chunk: OutputChunk) {
    if (chunk.facadeModuleId) {
      let name = normalizePath(path.relative(root, chunk.facadeModuleId));
      return name.replace(/\0/g, '');
    } else {
      return `_` + path.basename(chunk.fileName);
    }
  }

  const routeModuleMap = Object.values(bundle).reduce((map, chunk) => {
    if (chunk.type === 'chunk') {
      map.set(getChunkName(chunk), chunk);
    }
    return map;
  }, new Map());

  function getClientEntryAssent() {
    const asset =
      viteManifest[
        path.relative(root, resolvedWebRouterConfig.input.client.entry)
      ];

    if (!asset) {
      throw new Error(`No client entry found.`);
    }

    return asset;
  }

  function getBasename(file: string) {
    return path
      .basename(file, path.extname(file))
      .replace('.server', '')
      .replace('.client', '');
  }

  const imports: string[] = [];
  function getImportModule(moduleName: string) {
    const moduleId = path.resolve(
      path.dirname(resolvedWebRouterConfig.input.server.entry),
      moduleName
    );
    const fileName = path.relative(root, moduleId);
    const chunk = routeModuleMap.get(fileName);

    if (!chunk || chunk.type !== 'chunk' || !chunk.isEntry) {
      throw new Error(
        `Unable to build routemap.` +
          ` Since "${moduleName}" is not found in Rollup's output,` +
          ` it is recommended to try renaming the file: ${moduleId}`
      );
    }

    const source = './' + chunk.fileName;
    imports.push(source);

    return source;
  }

  // https://developer.mozilla.org/docs/Web/JavaScript/Guide/Regular_expressions#escaping
  function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  // eslint-disable-next-line no-template-curly-in-string
  // const basePlaceholder = "${workspace}";

  const json = Object.entries(manifest).reduce(
    (manifest, [key, value]) => {
      if (Array.isArray(value)) {
        // @ts-ignore
        manifest[key] = [];
        value.forEach((mod) => {
          // @ts-ignore
          manifest[key].push({
            ...mod,
            module: getImportModule(mod.module),
          });
        });
      } else if (value.module) {
        // @ts-ignore
        manifest[key] = {
          ...value,
          module: getImportModule(value.module),
        };
      } else {
        // @ts-ignore
        manifest[key] = value;
      }
      return manifest;
    },
    {
      //  base: basePlaceholder,
    } as RouteMap
  );

  const routemapJsonCode = JSON.stringify(json, null, 2);
  const routemapJsCode =
    imports
      .map((module, index) => `import * as _${index} from "${module}";`)
      .join('\n') +
    '\n\n' +
    `export default ${imports.reduce(
      (routemapJsonCode, source, index) =>
        routemapJsonCode.replaceAll(
          new RegExp(`(\\s*)${escapeRegExp(`"module": "${source}"`)}`, 'g'),
          `$1"source": "${source}",$1"module": _${index}`
        ),
      routemapJsonCode
    )}`; /*.replace(
      JSON.stringify(basePlaceholder),
      `new URL("./", import.meta.url).href`
    )*/

  const routemapDtsCode = [
    `import type { Manifest } from '@web-widget/web-router';`,
    `export default {} as Manifest;`,
  ].join('\n');

  const entryFileName = path.relative(
    root,
    resolvedWebRouterConfig.input.server.entry
  );
  const entryModuleName = './' + routeModuleMap.get(entryFileName).fileName;
  const clientImportmapCode = JSON.stringify(clientImportmap);
  const clientEntryModuleName = base + getClientEntryAssent().file;
  const clientEntryLink = getLinks(
    viteManifest,
    path.relative(root, resolvedWebRouterConfig.input.client.entry),
    base
  );
  const entryJsCode = [
    `import { mergeMeta } from "@web-widget/helpers";`,
    `import entry from ${JSON.stringify(entryModuleName)};`,
    `export * from ${JSON.stringify(entryModuleName)};`,
    `export default function start(manifest, options = {}) {`,
    `  return entry(manifest, {`,
    `    baseAsset: ${JSON.stringify(base)},`,
    `    baseModule: new URL("./", import.meta.url).href,`,
    `    ...options,`,
    `    defaultMeta: mergeMeta(options.defaultMeta || {}, {`,
    `      link: ${JSON.stringify(clientEntryLink)},`,
    `      style: [{`,
    `        content: "web-widget{display:contents}"`,
    `      }],`,
    `      script: [{`,
    `        type: "importmap",`,
    `        content: JSON.stringify(${clientImportmapCode})`,
    `      }, {`,
    `        type: "module",`,
    `        content: [`,
    `          'const modules = [${JSON.stringify(clientEntryModuleName)}];',`,
    `          'typeof importShim === "function"',`,
    `            '? modules.map(moduleName => importShim(moduleName))',`,
    `            ': modules.map(moduleName => import(moduleName))'`,
    `        ].join("")`,
    `      }]`,
    `    })`,
    `  });`,
    `}`,
  ].join('\n');
  const entryDtsCode = [
    `import type { Manifest, StartOptions } from '@web-widget/web-router';`,
    `export default {} as (manifest: Manifest, options?: StartOptions) => WebRouter;`,
  ].join('\n');

  const routemapBasename = getBasename(
    resolvedWebRouterConfig.input.server.routemap
  );
  const entryBasename = getBasename(resolvedWebRouterConfig.input.server.entry);

  return [
    // {
    //   type: "prebuilt-chunk",
    //   fileName: routemapBasename + ".json",
    //   code: routemapJsonCode,
    // },
    {
      type: 'prebuilt-chunk',
      fileName: routemapBasename + '.js',
      code: routemapJsCode,
    },
    {
      type: 'prebuilt-chunk',
      fileName: routemapBasename + '.d.ts',
      code: routemapDtsCode,
    },
    {
      type: 'prebuilt-chunk',
      fileName: entryBasename + '.js',
      code: entryJsCode,
    },
    {
      type: 'prebuilt-chunk',
      fileName: entryBasename + '.d.ts',
      code: entryDtsCode,
    },
  ];
}
