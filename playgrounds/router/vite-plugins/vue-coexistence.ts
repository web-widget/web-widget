import url from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { Plugin } from 'vite';

export interface VueRuntimeResolveRule {
  importerIncludes: string[];
  packageJsonId: string;
  runtimeImportId: string;
  runtimeSubpath: string;
}

function patchVueRuntimeResolvePlugin(rules: VueRuntimeResolveRule[]): Plugin {
  const toPosixPath = (id: string) => id.replaceAll('\\', '/');
  const resolvedRules = rules.map((rule) => {
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

  return {
    name: 'patchVueRuntimeResolve',
    enforce: 'pre',
    async resolveId(id, importer) {
      const resolvedRuntimeRule = resolvedRules.find(
        (rule) => id === rule.runtimeImportId
      );
      if (resolvedRuntimeRule) {
        return resolvedRuntimeRule.runtimePath;
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
 * Why this patch exists:
 *
 * We run Vue 2 and Vue 3 side-by-side in one Vite app. The official Vue plugins
 * each try to enforce their own global `vue` resolution strategy:
 * - Vue 3 plugin dedupes `vue` to one instance
 * - Vue 2 plugin injects a global alias for `vue`
 *
 * Those defaults are reasonable for single-version projects, but in a mixed
 * Vue2/Vue3 setup they conflict with each other and collapse both pipelines onto
 * the same `vue` resolution result. Once that happens, SFC transforms from one
 * side can accidentally load the other side's runtime (or a CJS fallback), which
 * causes SSR/runtime failures.
 *
 * So this patch removes the global alias/dedupe assumptions first, then lets our
 * scoped runtime-resolve plugin decide `vue` per importer path.
 */
function patchVuePluginConfig(): Plugin {
  return {
    name: 'patchVuePluginConfig',
    enforce: 'post',
    async config() {
      return {
        optimizeDeps: {
          // Avoid version conflicts caused by `optimizeDeps`.
          exclude: ['vue', 'vue-router'],
        },
      };
    },
    async configResolved(config) {
      const alias = config.resolve.alias;
      const dedupe = config.resolve.dedupe;

      if (Array.isArray(dedupe)) {
        // Patch vue3 plugin config.
        // @see https://github.com/vitejs/vite-plugin-vue/blob/main/packages/plugin-vue/src/index.ts#L147
        for (let index = dedupe.length - 1; index >= 0; index--) {
          if (dedupe[index] === 'vue') {
            dedupe.splice(index, 1);
          }
        }
      }

      if (Array.isArray(alias)) {
        // Patch vue2 plugin config.
        // @see https://github.com/vitejs/vite-plugin-vue2/blob/main/src/index.ts#L103
        for (let index = alias.length - 1; index >= 0; index--) {
          const item = alias[index];
          if (item?.find === 'vue') {
            alias.splice(index, 1);
          }
        }
      }
    },
  };
}

export function vueCoexistencePlugins(
  rules: VueRuntimeResolveRule[]
): Plugin[] {
  return [patchVueRuntimeResolvePlugin(rules), patchVuePluginConfig()];
}
