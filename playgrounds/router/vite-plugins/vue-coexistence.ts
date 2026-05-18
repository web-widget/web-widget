import url from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { ConfigEnv, Plugin, ResolvedConfig, UserConfig } from 'vite';

export interface VueRuntimeResolveRule {
  importerIncludes: string[];
  packageJsonId: string;
  runtimeImportId: string;
  runtimeSubpath: string;
}

export interface IsolateVueSfcPluginOptions {
  virtualIds: string[];
  workspace: string;
}

function toPosixPath(value: string) {
  return value.replaceAll('\\', '/');
}

function stripValidIdPrefix(id: string) {
  return id.startsWith('/@id/') ? id.slice('/@id/'.length) : id;
}

function extractSfcFilename(id: string) {
  const normalized = stripValidIdPrefix(toPosixPath(id));
  const queryIndex = normalized.indexOf('?');
  return queryIndex >= 0 ? normalized.slice(0, queryIndex) : normalized;
}

function shouldHandleVueId(
  id: string,
  { virtualIds, workspace }: IsolateVueSfcPluginOptions
) {
  if (virtualIds.includes(id)) {
    return true;
  }

  if (id.startsWith('\0')) {
    return false;
  }

  const filename = extractSfcFilename(id);
  return filename.endsWith('.vue') && filename.startsWith(workspace);
}

type HookHandler = (...args: any[]) => any;

type ObjectHook<H extends HookHandler> = Extract<
  NonNullable<Plugin['resolveId']>,
  { handler?: H }
>;

function wrapPluginHook<H extends HookHandler>(
  original: H | ObjectHook<H> | undefined,
  shouldApply: (args: Parameters<H>) => boolean,
  skip: () => ReturnType<H>
): H | ObjectHook<H> | undefined {
  if (!original) {
    return undefined;
  }

  const run = (fn: H, thisArg: unknown, args: Parameters<H>) =>
    shouldApply(args) ? fn.apply(thisArg, args) : skip();

  if (typeof original === 'function') {
    return function (this: unknown, ...args: Parameters<H>) {
      return run(original, this, args);
    } as H;
  }

  return {
    ...original,
    handler(this: unknown, ...args: Parameters<H>) {
      return run(original.handler!, this, args);
    },
  };
}

export function isolateVueSfcPlugin(
  plugin: Plugin,
  options: IsolateVueSfcPluginOptions
): Plugin {
  const { workspace } = options;

  return {
    ...plugin,
    resolveId: wrapPluginHook(
      plugin.resolveId as HookHandler | ObjectHook<HookHandler> | undefined,
      (args) => shouldHandleVueId(args[0], options),
      () => null
    ) as Plugin['resolveId'],
    load: wrapPluginHook(
      plugin.load as HookHandler | ObjectHook<HookHandler> | undefined,
      (args) => shouldHandleVueId(args[0], options),
      () => null
    ) as Plugin['load'],
    transform: wrapPluginHook(
      plugin.transform as HookHandler | ObjectHook<HookHandler> | undefined,
      (args) => shouldHandleVueId(args[1], options),
      () => null
    ) as Plugin['transform'],
    handleHotUpdate: wrapPluginHook(
      plugin.handleHotUpdate as
        | HookHandler
        | ObjectHook<HookHandler>
        | undefined,
      (args) =>
        toPosixPath((args[0] as { file: string }).file).startsWith(workspace),
      () => undefined
    ) as Plugin['handleHotUpdate'],
  };
}

function stripVueDedupeFromUserConfigPartial(partial: unknown): unknown {
  if (partial == null || typeof partial !== 'object') {
    return partial;
  }
  const p = partial as Record<string, unknown>;
  const next: Record<string, unknown> = { ...p };
  const resolve = p.resolve;
  if (resolve && typeof resolve === 'object') {
    const res = { ...(resolve as Record<string, unknown>) };
    if (Array.isArray(res.dedupe)) {
      res.dedupe = res.dedupe.filter((entry) => entry !== 'vue');
    }
    next.resolve = res;
  }
  return next;
}

function stripVueAliasEntriesFromResolvedConfig(config: {
  resolve: { alias: unknown };
}) {
  const alias = config.resolve.alias;
  if (!Array.isArray(alias)) {
    return;
  }
  for (let index = alias.length - 1; index >= 0; index--) {
    const entry = alias[index] as { find?: string | RegExp } | undefined;
    if (entry?.find === 'vue') {
      alias.splice(index, 1);
    }
  }
}

/**
 * Strip `resolve.dedupe` → `vue` from `@vitejs/plugin-vue`'s `config()` result so it
 * never enters the merged config (that plugin sets it in `config`, not `configResolved`).
 *
 * @see https://github.com/vitejs/vite-plugin-vue/blob/main/packages/plugin-vue/src/index.ts
 */
export function stripVue3PluginGlobalDedupe(plugin: Plugin): Plugin {
  const hook = plugin.config;
  if (!hook) {
    return plugin;
  }

  if (typeof hook === 'function') {
    const configHook = hook;
    async function wrapped(this: unknown, config: UserConfig, env: ConfigEnv) {
      const raw = await Promise.resolve(
        configHook.call(this as never, config, env)
      );
      return stripVueDedupeFromUserConfigPartial(raw) as Omit<
        UserConfig,
        'plugins'
      > | null;
    }
    return { ...plugin, config: wrapped as Plugin['config'] };
  }

  const objectHook = hook;
  async function wrappedHandler(
    this: unknown,
    config: UserConfig,
    env: ConfigEnv
  ) {
    const raw = await Promise.resolve(
      objectHook.handler.call(this as never, config, env)
    );
    return stripVueDedupeFromUserConfigPartial(raw) as Omit<
      UserConfig,
      'plugins'
    > | null;
  }

  return {
    ...plugin,
    config: {
      ...hook,
      handler: wrappedHandler,
    },
  };
}

/**
 * After `@vitejs/plugin-vue2`'s `configResolved` adds a global `vue` alias, remove it.
 * That plugin mutates `config.resolve.alias` in `configResolved`, not `config`.
 *
 * @see https://github.com/vitejs/vite-plugin-vue2/blob/main/src/index.ts
 */
export function stripVue2PluginGlobalVueAlias(plugin: Plugin): Plugin {
  const hook = plugin.configResolved;
  if (!hook) {
    return plugin;
  }

  if (typeof hook === 'function') {
    const resolvedHook = hook;
    async function wrapped(this: unknown, config: ResolvedConfig) {
      await Promise.resolve(resolvedHook.call(this as never, config));
      stripVueAliasEntriesFromResolvedConfig(config);
    }
    return { ...plugin, configResolved: wrapped as Plugin['configResolved'] };
  }

  const objectResolvedHook = hook;
  async function wrappedHandler(this: unknown, config: ResolvedConfig) {
    await Promise.resolve(
      objectResolvedHook.handler.call(this as never, config)
    );
    stripVueAliasEntriesFromResolvedConfig(config);
  }

  return {
    ...plugin,
    configResolved: {
      ...hook,
      handler: wrappedHandler,
    },
  };
}

type ResolvedVueRuntimeRule = VueRuntimeResolveRule & { runtimePath: string };

function resolveRulesWithRuntimePaths(
  rules: VueRuntimeResolveRule[]
): ResolvedVueRuntimeRule[] {
  return rules.map((rule) => {
    const requireFromRuleWorkspace = createRequire(
      url.fileURLToPath(import.meta.resolve(rule.packageJsonId))
    );
    const vuePackagePath = requireFromRuleWorkspace.resolve('vue/package.json');
    return {
      ...rule,
      runtimePath: toPosixPath(
        path.join(path.dirname(vuePackagePath), rule.runtimeSubpath)
      ),
    };
  });
}

function createVueRuntimeResolvePlugin(
  resolvedRules: ResolvedVueRuntimeRule[]
): Plugin {
  return {
    name: 'vue-coexistence:runtime-resolve',
    enforce: 'pre',
    config() {
      return {
        optimizeDeps: {
          // Avoid version conflicts caused by `optimizeDeps`.
          exclude: ['vue', 'vue-router'],
        },
      };
    },
    async resolveId(id, importer) {
      const byRuntimeId = resolvedRules.find(
        (rule) => id === rule.runtimeImportId
      );
      if (byRuntimeId) {
        return byRuntimeId.runtimePath;
      }

      if (id === 'vue' && importer) {
        const normalizedImporter = toPosixPath(importer);
        const matchedRule = resolvedRules.find((rule) =>
          rule.importerIncludes.some((segment) =>
            normalizedImporter.includes(segment)
          )
        );
        if (matchedRule) {
          return matchedRule.runtimePath;
        }
      }
      return null;
    },
  };
}

/**
 * Official Vue Vite plugins assume a single `vue` dependency: the Vue 3 plugin
 * dedupes `vue`, and the Vue 2 plugin adds a global `vue` alias. In a mixed
 * Vue 2 / Vue 3 workspace those mechanisms fight each other and force both SFC
 * pipelines toward one resolved runtime, which breaks transforms and SSR when
 * the wrong build or a CJS fallback is loaded.
 *
 * Returns plugins that resolve `vue` per importer from `rules` and set
 * `optimizeDeps.exclude` for `vue` / `vue-router`. Wrap each official plugin with
 * {@link stripVue3PluginGlobalDedupe} / {@link stripVue2PluginGlobalVueAlias}.
 * In this playground the result is prepended inside `vuePresetsPlugin()` once.
 */
export function vueCoexistencePlugins(
  rules: VueRuntimeResolveRule[]
): Plugin[] {
  const resolvedRules = resolveRulesWithRuntimePaths(rules);
  return [createVueRuntimeResolvePlugin(resolvedRules)];
}
