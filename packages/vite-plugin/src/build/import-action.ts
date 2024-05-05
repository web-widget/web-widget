import { createFilter, type FilterPattern } from '@rollup/pluginutils';
import * as esModuleLexer from 'es-module-lexer';
import MagicString from 'magic-string';
import type { Plugin } from 'vite';
import {
  getWebRouterPluginApi,
  importsToImportNames,
  relativePathWithDot,
} from '@/utils';

const globalCache: Set<string> = new Set();

export interface ImportActionPluginOptions {
  cache?: Set<string>;
  exclude?: FilterPattern;
  excludeImporter?: FilterPattern;
  include?: FilterPattern;
  includeImporter?: FilterPattern;
  serverUrl?: (file: string) => Promise<string>;
}

/**
 * Input:
 *
 * import { echo } from "./actions/index@action.ts";
 * ...
 * const value = await echo('hello world');
 *
 * Becomes:
 *
 * import { rpcClient } from "@web-widget/action/client";
 * const { echo } = rpcClient("/actions");
 * ...
 * const value = await echo("hello world");
 */
export function importActionPlugin(
  options: ImportActionPluginOptions = {}
): Plugin {
  let root: string;
  let filter: (id: string | unknown) => boolean;
  let importerFilter: (id: string | unknown) => boolean;
  let cache: Set<string>;
  let serverUrl: (file: string) => Promise<string>;

  return {
    name: '@widget:import-action',
    async config() {},
    async configResolved(config) {
      const {
        exclude,
        excludeImporter,
        includeImporter = /\.(js|mjs|jsx|ts|tsx)$/,
        include = /(?:\.|@)action\..*$/,
      } = options;

      cache = options.cache ?? globalCache;
      filter = createFilter(include, exclude);
      importerFilter = createFilter(includeImporter, excludeImporter);
      root = config.root;

      const webRouterPluginApi = getWebRouterPluginApi(config);

      if (options.serverUrl) {
        serverUrl = options.serverUrl;
      }

      if (!serverUrl && webRouterPluginApi) {
        serverUrl = async (file) => {
          const id = relativePathWithDot(root, file);
          const routemap = await webRouterPluginApi.serverRoutemap();
          const action = routemap.actions?.find(({ module }) => {
            return module === id;
          });

          if (action) {
            if (/[^\w/.\-$]/.test(action.pathname)) {
              throw new TypeError(
                `Invalid pathname: ${action.pathname}. Action routes cannot contain dynamic parameters.`
              );
            }
            return action.pathname;
          }
          return '';
        };
      }

      if (!serverUrl) {
        throw new Error('serverUrl option is required.');
      }
    },
    async transform(code, id, { ssr } = {}) {
      if (ssr) {
        return null;
      }

      if (!importerFilter(id)) {
        return null;
      }

      let imports;

      try {
        await esModuleLexer.init;
        [imports] = esModuleLexer.parse(code, id);
      } catch (error) {
        return this.error(error);
      }

      const actionModules: {
        moduleId: string;
        moduleName: string;
        statementEnd: number;
        statementStart: number;
      }[] = [];

      for (const importSpecifier of imports) {
        const { n: moduleName, d: dynamicImport } = importSpecifier;

        const importModule = moduleName
          ? (
              await this.resolve(moduleName, id, {
                skipSelf: true,
              })
            )?.id
          : undefined;

        if (importModule && dynamicImport === -1 && filter(importModule)) {
          const cacheKey = [id, importModule].join(',');
          if (!cache.has(cacheKey)) {
            actionModules.push({
              moduleId: importModule,
              moduleName: moduleName as string,
              statementEnd: importSpecifier.se,
              statementStart: importSpecifier.ss,
            });
          } else {
            cache.add(cacheKey);
          }
        }
      }

      if (actionModules.length === 0) {
        return null;
      }

      const magicString = new MagicString(code);

      for (const {
        statementStart,
        statementEnd,
        moduleId,
        moduleName,
      } of actionModules) {
        const names = importsToImportNames(
          imports,
          code.substring(statementStart, statementEnd)
        );

        if (!names.length) {
          continue;
        }

        const url = await serverUrl(moduleId);
        if (!url) {
          throw new Error('serverUrl option is required.');
        }

        const methods = names.map(({ name, alias }) =>
          alias ? `${name}:${alias}` : name
        );
        const content =
          `import { rpcClient } from "@web-widget/helpers/action";\n` +
          `const { ${methods.join(', ')} } = /* @__PURE__ */ rpcClient(/*${JSON.stringify(moduleName)}*/ ${JSON.stringify(url)})`;

        magicString.update(statementStart, statementEnd, content);
      }

      return {
        code: magicString.toString(),
        map: magicString.generateMap(),
      };
    },
  };
}
