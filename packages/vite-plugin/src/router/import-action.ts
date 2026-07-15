import { createFilter, type FilterPattern } from '@rollup/pluginutils';
import * as esModuleLexer from 'es-module-lexer';
import type { Plugin } from 'vite';
import type { ExportSpecifier } from 'es-module-lexer';
import { applyToClientEnvironment } from '@/internal/environment';
import { getWebRouterPluginApi } from '@/internal/manifest';
import { relativePathWithDot } from '@/internal/path';
import { createAliasGenerator } from '@/internal/alias';
import { ACTION_MODULE_PATTERN } from '@/internal/module-conventions';

export interface ImportActionPluginOptions {
  cache?: Set<string>;
  exclude?: FilterPattern;
  excludeImporter?: FilterPattern;
  include?: FilterPattern;
  includeImporter?: FilterPattern;
  serverUrl?: (file: string) => Promise<string>;
}

/**
 * Input(client): functions@action.ts
 *
 * export async function echo(message) {}
 * export default async function() { }
 *
 * Becomes(client): functions@action.ts
 *
 * import { rpcClient } from "@web-widget/helpers/action";
 * const __$exports0$__ = rpcClient("/functions");
 * export const echo = __$exports0$__.echo;
 * export default __$exports0$__.default;
 */
export function importActionPlugin(
  options: ImportActionPluginOptions = {}
): Plugin {
  let root: string;
  let filter: (id: string | unknown) => boolean;
  let serverUrl: (file: string) => Promise<string>;
  let enabled: boolean;

  return {
    name: '@web-widget:import-action',
    applyToEnvironment: applyToClientEnvironment(),
    sharedDuringBuild: true,

    async configResolved(config) {
      const { exclude, include = ACTION_MODULE_PATTERN } = options;

      filter = createFilter(include, exclude);
      root = config.root;

      const webRouterPluginApi = getWebRouterPluginApi(config);

      if (options.serverUrl) {
        serverUrl = options.serverUrl;
      }

      if (!serverUrl && webRouterPluginApi) {
        enabled = webRouterPluginApi.config.serverAction.enabled;
        serverUrl = async (file) => {
          const id = relativePathWithDot(root, file);
          const routemap = await webRouterPluginApi.serverRoutemap();
          const action = routemap.actions?.find(({ module }) => {
            return module === id;
          });

          if (!action) {
            throw new Error(
              `The action module is not registered in the server routing table.\n` +
                `Please check the "routemap.server.json" file`
            );
          }

          return action.pathname;
        };
      }

      if (!serverUrl) {
        throw new Error('"serverUrl" option is required.');
      }
    },

    async transform(code, id) {
      if (!enabled) {
        return null;
      }

      if (!filter(id)) {
        return null;
      }

      let exports: ReadonlyArray<ExportSpecifier>;

      try {
        await esModuleLexer.init;
        [, exports] = esModuleLexer.parse(code, id);
      } catch (error) {
        return this.error(
          error instanceof Error ? error.message : String(error)
        );
      }

      const names = exports.map(({ n }) => n);

      if (names.length === 0) {
        return null;
      }

      let url: string | undefined;

      try {
        url = await serverUrl(id);
        if (!url) {
          throw new Error(
            `options.serverUrl(${JSON.stringify(id)}) returns no result.`
          );
        }
      } catch (error) {
        return this.error(
          error instanceof Error ? error.message : String(error)
        );
      }

      const alias = createAliasGenerator();
      const exportsVar = alias('exports');

      let content =
        `import { rpcClient } from "@web-widget/helpers/action";\n` +
        `const ${exportsVar} = /* @__PURE__ */ rpcClient(${JSON.stringify(url)})`;

      names.forEach((name) => {
        if (name === 'default') {
          content += `\nexport default ${exportsVar}.default;`;
        } else {
          content += `\nexport const ${name} = ${exportsVar}.${name};`;
        }
      });

      return {
        code: content,
        map: null,
      };
    },
  };
}
