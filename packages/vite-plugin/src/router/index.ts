import path from 'node:path';
import fs from 'node:fs/promises';
import builtins from 'builtin-modules';
import type {
  ConfigEnv,
  EnvironmentOptions,
  Plugin,
  SSRTarget,
  UserConfig,
  ViteBuilder,
} from 'vite';
import type { InlineConfig as VitestInlineConfig } from 'vitest/node';
import { parseWebRouterConfig } from '@/internal/config';
import { ensureConventionFiles } from '@/internal/ensure-convention-files';
import { webRouterDevServerPlugin } from '@/dev';
import { createServerFullReloadPlugin } from '@/dev/server-full-reload-plugin';
import { importActionPlugin } from './import-action';
import { webRouterPreviewServerPlugin } from './preview';
import { createRouterPluginHost, type RouterPluginHost } from './host';
import {
  type RouteMap,
  type WebRouterPlugin,
  type WebRouterUserConfig,
} from '@/types';
import {
  runRouterBuildApp,
  runRouterServerBuildApp,
  createServerOutputPlugin,
} from './server-output';
import {
  resolveClientEntryPoints,
  resolveServerEntryPoints,
} from '@/internal/build-entry-points';
import { defaultWidgetPathMatcher } from '@/internal/collect-route-assets';
import { mergeRouterVitestConfig } from '@/vitest-config';
import { createRemoveAsyncHooksPlugin } from './remove-async-hooks';
import { createServerEntryPlugin } from './server-entry';

interface VitestUserConfig extends UserConfig {
  test?: VitestInlineConfig;
}

const ENTRY_ID = '@entry';
const SERVER_ENTRY_OUTPUT_NAME = 'index';
const WEBWORKER_SERVER_RESOLVE_CONDITIONS = [
  'worklet',
  'worker',
  'import',
  'module',
  'default',
];

type ImportMap = {
  imports?: Record<string, string>;
  scopes?: Record<string, Record<string, string>>;
};

function shouldBuildClient(env: ConfigEnv) {
  return !env.isSsrBuild;
}

function createEnvironmentBuildOptions(
  host: RouterPluginHost,
  config: VitestUserConfig,
  name: string
): EnvironmentOptions {
  const {
    clientImportmap,
    clientRoutemapEntryPoints,
    resolvedWebRouterConfig,
    serverRoutemapEntryPoints,
    serverTarget,
  } = host.state;
  const isServer = name === 'ssr';
  const assetsDir = config.build?.assetsDir ?? 'assets';
  const entryPoints = isServer
    ? serverRoutemapEntryPoints
    : clientRoutemapEntryPoints;
  const rolldownUserExternal = config.build?.rolldownOptions?.external;

  return {
    ...(isServer ? { publicDir: config.publicDir ?? false } : {}),
    build: {
      outDir: path.join(
        resolvedWebRouterConfig.output.dir,
        isServer
          ? resolvedWebRouterConfig.output.server
          : resolvedWebRouterConfig.output.client
      ),
      emptyOutDir: true,
      cssCodeSplit: true,
      manifest: isServer ? undefined : resolvedWebRouterConfig.output.manifest,
      ...(isServer ? { minify: false as const } : {}),
      ...(!isServer && config.build?.minify !== undefined
        ? { minify: config.build.minify }
        : {}),
      rolldownOptions: {
        input: {
          ...entryPoints.points,
          [ENTRY_ID]: isServer
            ? resolvedWebRouterConfig.input.server.entry
            : resolvedWebRouterConfig.input.client.entry,
        },
        preserveEntrySignatures: 'allow-extension',
        treeshake: config.build?.rolldownOptions?.treeshake ?? true,
        ...(isServer && serverTarget !== 'webworker'
          ? rolldownUserExternal !== undefined
            ? {
                external: rolldownUserExternal,
              }
            : {}
          : {
              external: isServer
                ? (builtins as string[])
                : Object.keys(clientImportmap?.imports ?? []),
            }),
        output: {
          ...(isServer
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
  };
}

async function createSharedConfig(
  host: RouterPluginHost,
  options: WebRouterUserConfig,
  config: VitestUserConfig,
  env: ConfigEnv
): Promise<VitestUserConfig> {
  const root = config.root || process.cwd();
  const serverTarget: SSRTarget = config.ssr?.target ?? 'webworker';

  const resolvedWebRouterConfig = parseWebRouterConfig(
    options,
    root,
    config.resolve?.extensions
  );

  await ensureConventionFiles({
    config: resolvedWebRouterConfig,
    root,
  });

  const serverRoutemapPath = resolvedWebRouterConfig.input.server.routemap;
  const clientImportmap = JSON.parse(
    await fs.readFile(resolvedWebRouterConfig.input.client.importmap, 'utf-8')
  ) as ImportMap;
  const serverRoutemap = JSON.parse(
    await fs.readFile(serverRoutemapPath, 'utf-8')
  ) as RouteMap;

  const serverRoutemapEntryPoints = resolveServerEntryPoints(
    serverRoutemap,
    serverRoutemapPath,
    root
  );
  const extensions = config.resolve?.extensions ?? [
    '.mjs',
    '.js',
    '.mts',
    '.ts',
    '.jsx',
    '.tsx',
    '.vue',
    '.json',
  ];
  const { entryPoints: clientRoutemapEntryPoints, routeClientAssets } =
    await resolveClientEntryPoints(serverRoutemap, serverRoutemapPath, root, {
      extensions,
      isWidget: defaultWidgetPathMatcher,
      widgetSearchDirs: [
        resolvedWebRouterConfig.filesystemRouting.dir.replace(/^\.\//, ''),
      ],
    });

  const resolveConditions =
    config.ssr?.resolve?.conditions ??
    (serverTarget === 'webworker'
      ? WEBWORKER_SERVER_RESOLVE_CONDITIONS
      : undefined);

  const useAppBuilder = env.command === 'build' && shouldBuildClient(env);

  host.initialize({
    base: config.base ?? '/',
    clientImportmap,
    clientRoutemapEntryPoints,
    dev: env.command === 'serve',
    resolvedWebRouterConfig,
    resolveConditions,
    root,
    routeClientAssets,
    serverRoutemapEntryPoints,
    sourcemap: !!config.build?.sourcemap,
    serverTarget,
    useAppBuilder,
  });

  const test = mergeRouterVitestConfig(config.test, serverTarget, env);

  return {
    root,
    mode: env.mode,
    appType: 'custom',
    optimizeDeps: {
      exclude: [],
    },
    ...(env.command === 'serve'
      ? {
          server: {
            warmup: {
              ssrFiles: [
                ...(config.server?.warmup?.ssrFiles ?? []),
                resolvedWebRouterConfig.input.server.entry,
                resolvedWebRouterConfig.input.server.routemap,
              ],
            },
          },
        }
      : {}),
    ssr: {
      target: serverTarget,
      external: ['node:async_hooks'],
      resolve: {
        ...(config.ssr?.resolve ?? {}),
        ...(resolveConditions ? { conditions: resolveConditions } : {}),
      },
    },
    builder:
      env.command === 'build'
        ? {
            sharedPlugins: true,
            buildApp(builder: ViteBuilder) {
              if (env.isSsrBuild) {
                return runRouterServerBuildApp(host, builder);
              }
              return runRouterBuildApp(host, builder);
            },
          }
        : undefined,
    ...(test ? { test } : {}),
  };
}

function createRouterPlugin(
  host: RouterPluginHost,
  options: WebRouterUserConfig
): WebRouterPlugin {
  const plugin: WebRouterPlugin = {
    name: '@web-widget:router',
    enforce: 'pre',
    sharedDuringBuild: true,
    api: host.api,

    async config(config, env) {
      return createSharedConfig(host, options, config, env);
    },

    configEnvironment(name, config, env) {
      if (env.command !== 'build') {
        return;
      }

      if (name === 'client' && !shouldBuildClient(env)) {
        return;
      }

      return createEnvironmentBuildOptions(host, config, name);
    },
  };
  return plugin;
}

export function createRouterPlugins(
  options: WebRouterUserConfig = {}
): Plugin[] {
  const host = createRouterPluginHost();

  return [
    createRouterPlugin(host, options) as Plugin,
    createServerEntryPlugin(host),
    createServerOutputPlugin(host),
    createRemoveAsyncHooksPlugin(host),
    webRouterDevServerPlugin(host),
    createServerFullReloadPlugin(host),
    webRouterPreviewServerPlugin(),
    importActionPlugin(),
  ];
}
