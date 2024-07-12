import path from 'node:path';
import { createFilter, type FilterPattern } from '@rollup/pluginutils';
import * as esModuleLexer from 'es-module-lexer';
import MagicString from 'magic-string';
import type { Plugin } from 'vite';
import {
  getWebRouterPluginApi,
  importsToImportNames,
  relativePathWithDot,
} from './utils';

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
 * import defaultExport, { exportName } from "./actions/foo@action.ts";
 * ...
 * const value = await echo('hello world');
 *
 * Becomes:
 *
 * import { rpcClient } from "@web-widget/helpers/action";
 * const { echo } = rpcClient("/actions");
 * const { default: defaultExport, exportName } = rpcClient("/foo");
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
  let enabled: boolean;

  return {
    name: '@web-widget:import-action',
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
        enabled = webRouterPluginApi.config.action;
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

      const modules: {
        moduleId: string;
        moduleName: string;
        statementEnd: number;
        statementStart: number;
      }[] = [];

      for (const importSpecifier of imports) {
        const {
          n: moduleName,
          d: dynamicImport,
          ss: statementStart,
          se: statementEnd,
        } = importSpecifier;

        let importModule: string | undefined;

        if (moduleName) {
          if (moduleName.startsWith('./') && !moduleName.includes('?')) {
            // NOTE: Use `path.resolve` instead of `this.resolve` to avoid the latter waiting for a result but failing to return one.
            // Possible errors with `this.resolve`:
            // Unexpected early exit. This happens when Promises returned by plugins cannot resolve. Unfinished hook action(s) on exit
            importModule = path.resolve(path.dirname(id), moduleName);
          } else {
            importModule = (
              await this.resolve(moduleName, id, {
                skipSelf: true,
              })
            )?.id;
          }
        }

        if (importModule && filter(importModule)) {
          if (dynamicImport !== -1) {
            return this.error(
              new SyntaxError(`Dynamic imports are not supported.`),
              statementStart
            );
          }
          const cacheKey = [id, importModule].join(',');
          if (!cache.has(cacheKey)) {
            modules.push({
              moduleId: importModule,
              moduleName: moduleName as string,
              statementEnd,
              statementStart,
            });
          } else {
            cache.add(cacheKey);
          }
        }
      }

      if (modules.length === 0) {
        return null;
      }

      const magicString = new MagicString(code);
      const dynamicPathname = /[^\w/.\-$]/;

      for (const { statementStart, statementEnd, moduleId } of modules) {
        const names = importsToImportNames(
          imports,
          code.substring(statementStart, statementEnd)
        );

        if (!names.length) {
          continue;
        }

        let url;

        try {
          url = await serverUrl(moduleId);
        } catch (error) {
          return this.error(error, statementStart);
        }

        if (typeof url !== 'string') {
          return this.error(
            TypeError(
              `options.serverUrl(${JSON.stringify(moduleId)}) returns no result.`
            )
          );
        }

        if (dynamicPathname.test(url)) {
          return this.error(
            new TypeError(
              `Invalid input: ${url}. Action route cannot contain dynamic parameters.`
            )
          );
        }

        const methods = names.map(([name, alias]) =>
          alias ? `${name}:${alias}` : name
        );
        const content =
          `import { rpcClient } from "@web-widget/helpers/action";\n` +
          `const { ${methods.join(', ')} } = /* @__PURE__ */ rpcClient(${JSON.stringify(url)})`;

        magicString.update(statementStart, statementEnd, content);
      }

      return {
        code: magicString.toString(),
        map: magicString.generateMap(),
      };
    },
  };
}
