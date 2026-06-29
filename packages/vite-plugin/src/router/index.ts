import path from 'node:path';
import fs from 'node:fs/promises';
import builtins from 'builtin-modules';
import {
  defaultClientConditions,
  type ConfigEnv,
  type EnvironmentOptions,
  type Plugin,
  type SSRTarget,
  type UserConfig,
  type ViteBuilder,
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
  createServerAssetFileNameResolver,
  createServerManualChunks,
  resolveClientEntryPoints,
  resolveServerEntryPoints,
  type BuildEntryPoints,
} from '@/internal/build-entry-points';
import { mergeRouterVitestConfig } from '@/vitest-config';
import { createRemoveAsyncHooksPlugin } from './remove-async-hooks';
import { createServerEntryPlugin } from './server-entry';

interface VitestUserConfig extends UserConfig {
  test?: VitestInlineConfig;
}

const ENTRY_ID = '@entry';
const SERVER_ENTRY_OUTPUT_NAME = 'index';
/**
 * Resolve conditions used when ssr.target === 'webworker'.
 *
 * Vite defaults to defaultClientConditions (includes browser), which makes
 * third-party packages resolve to their DOM version (depends on window/document)
 * and breaks CF/Worker runtimes. We prepend worker/worklet so own packages
 * resolve to their server entry, and filter out browser so third-party packages
 * fall back to module/default universal versions.
 *
 * Built on top of Vite defaults to keep development|production (so dev mode
 * can resolve to source files) and to track future Vite evolution. Users can
 * override this by explicitly setting ssr.resolve.conditions, e.g. when using
 * @cloudflare/vite-plugin (Vite 6 Environment API).
 */
const WEBWORKER_SERVER_RESOLVE_CONDITIONS = [
  'worklet',
  'worker',
  ...defaultClientConditions.filter((c) => c !== 'browser'),
];

type ImportMap = {
  imports?: Record<string, string>;
  scopes?: Record<string, Record<string, string>>;
};

const EMPTY_CLIENT_ENTRY_POINTS: BuildEntryPoints = {
  points: Object.create(null),
  exposures: new Set(),
};

async function resolveClientBuildGraph(host: RouterPluginHost) {
  const context = host.state.clientBuildGraphContext;
  if (!context) {
    return;
  }

  const { root, widgetModuleFilter, resolvedWebRouterConfig } = host.state;
  const entryPoints = await resolveClientEntryPoints(
    context.serverRoutemap,
    context.serverRoutemapPath,
    root,
    {
      dynamicImportPredicate: widgetModuleFilter,
      searchDirs: resolvedWebRouterConfig.widget.searchDirs,
      ignore: resolvedWebRouterConfig.ignore,
    }
  );

  host.patchState({
    clientRoutemapEntryPoints: entryPoints,
  });
}

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
  // Vite environment key is `ssr`; docs refer to this as the server environment.
  const isServer = name === 'ssr';
  const assetsDir = config.build?.assetsDir ?? 'assets';
  const entryPoints = isServer
    ? serverRoutemapEntryPoints
    : clientRoutemapEntryPoints;
  const serverAssetFileNames = isServer
    ? createServerAssetFileNameResolver({
        assetsDir,
        root: host.state.root,
        entryId: ENTRY_ID,
        serverEntryOutputName: SERVER_ENTRY_OUTPUT_NAME,
      })
    : undefined;
  const serverManualChunks = isServer
    ? createServerManualChunks(host.state.root)
    : undefined;

  return {
    ...(isServer ? { publicDir: config.publicDir ?? false } : {}),
    build: {
      outDir: path.join(
        resolvedWebRouterConfig.output.dir,
        isServer
          ? resolvedWebRouterConfig.output.server
          : resolvedWebRouterConfig.output.client
      ),
      emptyOutDir: config.build?.emptyOutDir ?? true,
      cssCodeSplit: true,
      manifest: isServer ? undefined : resolvedWebRouterConfig.output.manifest,
      ...(config.build?.minify !== undefined
        ? { minify: config.build.minify }
        : isServer
          ? { minify: false as const }
          : {}),
      rolldownOptions: {
        input: {
          ...(isServer ? {} : entryPoints.points),
          [ENTRY_ID]: isServer
            ? resolvedWebRouterConfig.input.server.entry
            : resolvedWebRouterConfig.input.client.entry,
        },
        preserveEntrySignatures: 'allow-extension',
        treeshake: config.build?.rolldownOptions?.treeshake ?? true,
        ...(isServer && serverTarget !== 'webworker'
          ? {}
          : {
              external: isServer
                ? (builtins as string[])
                : Object.keys(clientImportmap?.imports ?? []),
            }),
        output: {
          ...(isServer
            ? {
                codeSplitting: true,
                ...(serverManualChunks
                  ? { manualChunks: serverManualChunks }
                  : {}),
              }
            : {}),
          ...(isServer
            ? (serverAssetFileNames as NonNullable<
                NonNullable<VitestUserConfig['build']>['rolldownOptions']
              >['output'])
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

  host.initialize({
    base: config.base ?? '/',
    clientBuildGraphContext: {
      serverRoutemap,
      serverRoutemapPath,
    },
    clientImportmap,
    clientRoutemapEntryPoints: EMPTY_CLIENT_ENTRY_POINTS,
    dev: env.command === 'serve',
    resolvedWebRouterConfig,
    resolveConditions:
      config.ssr?.resolve?.conditions === undefined &&
      serverTarget === 'webworker'
        ? WEBWORKER_SERVER_RESOLVE_CONDITIONS
        : undefined,
    root,
    serverRoutemapEntryPoints,
    sourcemap: !!config.build?.sourcemap,
    serverTarget,
    useAppBuilder: env.command === 'build' && shouldBuildClient(env),
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
      ...(host.state.resolveConditions
        ? { resolve: { conditions: host.state.resolveConditions } }
        : {}),
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

    async configResolved() {
      if (
        host.state.dev &&
        Object.keys(host.state.clientRoutemapEntryPoints.points).length === 0
      ) {
        await resolveClientBuildGraph(host);
      }
    },

    async configEnvironment(name, config, env) {
      if (env.command !== 'build') {
        return;
      }

      if (name === 'client' && !shouldBuildClient(env)) {
        return;
      }

      if (
        Object.keys(host.state.clientRoutemapEntryPoints.points).length === 0
      ) {
        await resolveClientBuildGraph(host);
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
