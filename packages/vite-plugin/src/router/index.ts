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
  createClientManifestCapturePlugin,
} from './server-output';
import {
  createServerAssetFileNameResolver,
  createServerManualChunks,
  collectRoutemapModulePaths,
  resolveClientEntryPoints,
  resolveServerEntryPoints,
  type BuildEntryPoints,
} from '@/internal/build-entry-points';
import {
  collectRouteModuleAssets,
  defaultWidgetPathMatcher,
} from '@/internal/collect-route-assets';
import { mergeRouterVitestConfig } from '@/vitest-config';
import { createRemoveAsyncHooksPlugin } from './remove-async-hooks';
import { createServerEntryPlugin } from './server-entry';
import { createServerAssetsPlugin } from './server-assets-plugin';
import { createSkipServerCssPlugin } from './skip-server-css';

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

  const { root, widgetModuleFilter } = host.state;
  // `widgetModuleFilter` is set by `webWidgetPlugin` in a `config` hook with
  // `enforce: 'post'`, which runs AFTER this router plugin's `config` hook
  // (`enforce: 'pre'`). Fall back to the default `[.@]widget.` matcher so
  // asset/manifest-link collection works even without an explicit
  // `webWidgetPlugin` (or when its hook has not run yet).
  const widgetFilter = widgetModuleFilter ?? defaultWidgetPathMatcher;
  const entryPoints = await resolveClientEntryPoints(
    context.serverRoutemap,
    context.serverRoutemapPath,
    root,
    {
      widgetModuleFilter: widgetFilter,
      caches: host.api.getRouteAssetCaches(),
      routeClientAssets: host.api.getRouteClientAssets(),
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
      // The client build requires a manifest for server asset resolution.
      // Respect a user-provided manifest path; force-enable when unset or
      // disabled. The server build never emits a manifest.
      manifest: isServer ? undefined : config.build?.manifest || true,
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
    compoundExtensions: host.state.compoundExtensions,
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
    serverAssetsDir: config.build?.assetsDir ?? 'assets',
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
    ...(env.command === 'serve'
      ? {
          server: {
            warmup: {
              ssrFiles: [
                resolvedWebRouterConfig.input.server.entry,
                resolvedWebRouterConfig.input.server.routemap,
              ],
              clientFiles: [resolvedWebRouterConfig.input.client.entry],
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

    async buildStart() {
      // Pre-compute route client assets so SSR transform can look them up
      // in O(1) instead of re-crawling each route's import graph.
      if (host.state.routeClientAssets?.size) {
        return;
      }
      const context = host.state.clientBuildGraphContext;
      if (!context) {
        return;
      }
      const { root, widgetModuleFilter } = host.state;
      // Same fallback as in `resolveClientBuildGraph`: when `webWidgetPlugin`
      // has not registered a filter yet, use the default widget path matcher.
      const widgetFilter = widgetModuleFilter ?? defaultWidgetPathMatcher;
      // Reuse source/parsing caches from `resolveClientEntryPoints` (configured
      // at `configEnvironment` time) but use a fresh `resolved` cache: the
      // resolver here is `this.resolve` (supports aliases), which is different
      // from the default resolver used earlier.
      const sharedCaches = host.api.getRouteAssetCaches();
      const caches = {
        ...sharedCaches,
        resolved: new Map(),
      };
      const assetsMap = host.api.getRouteClientAssets();
      const routeModules = collectRoutemapModulePaths(
        context.serverRoutemap,
        context.serverRoutemapPath,
        ['routes', 'fallbacks']
      );
      for (const { modulePath } of routeModules) {
        const assets = await collectRouteModuleAssets(modulePath, {
          root,
          widgetModuleFilter: widgetFilter,
          resolveId: async (specifier, importer) => {
            const r = await this.resolve(specifier, importer);
            return r?.id ?? null;
          },
          caches,
        });
        assetsMap.set(modulePath, assets);
      }
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
    createClientManifestCapturePlugin(host),
    createServerAssetsPlugin(host),
    createRemoveAsyncHooksPlugin(host),
    createSkipServerCssPlugin(),
    ...webRouterDevServerPlugin(host),
    createServerFullReloadPlugin(host),
    webRouterPreviewServerPlugin(),
    importActionPlugin(),
  ];
}
