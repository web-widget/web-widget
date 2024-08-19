import { createFilter, type FilterPattern } from '@rollup/pluginutils';
import * as esModuleLexer from 'es-module-lexer';
import type { Plugin } from 'vite';
import type { ExportSpecifier } from 'es-module-lexer';
import { getWebRouterPluginApi, relativePathWithDot } from './utils';

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
 * const $exports = rpcClient("/functions");
 * export const echo = $exports.echo;
 * export default $exports.default;
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

    async configResolved(config) {
      const { exclude, include = /(?:\.|@)action\..*$/ } = options;

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

    async transform(code, id, { ssr } = {}) {
      if (!enabled || ssr) {
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
        return this.error(error);
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
        return this.error(error);
      }

      let content =
        `import { rpcClient } from "@web-widget/helpers/action";\n` +
        `const $exports = /* @__PURE__ */ rpcClient(${JSON.stringify(url)})`;

      names.forEach((name) => {
        if (name === 'default') {
          content += `\nexport default $exports.default;`;
        } else {
          content += `\nexport const ${name} = $exports.${name};`;
        }
      });

      return {
        code: content,
        map: null,
      };
    },
  };
}
