import path from 'node:path';
import { createFilter, type FilterPattern } from '@rollup/pluginutils';
import * as esModuleLexer from 'es-module-lexer';
import MagicString from 'magic-string';
import type {
  IndexHtmlTransformResult,
  Plugin,
  Manifest as ViteManifest,
} from 'vite';
import {
  getManifest,
  getWebRouterPluginApi,
  normalizePath,
  removeAs,
} from './utils';
import { createRequire } from 'node:module';
import { extractImportBindings } from './compiler/parser';
const require = createRequire(import.meta.url);

const ASSET_PROTOCOL = 'asset:';
const ASSET_PLACEHOLDER_REG = /(["'`])asset:\/\/(.*?)\1/g;
const ASSET_PLACEHOLDER = `${ASSET_PROTOCOL}//`;

let index = 0;
const alias = (name: string) => `__$${name}${index++}$__`;
const globalCache: Set<string> = new Set();

export interface ImportRenderPluginOptions {
  cache?: Set<string>;
  /** @deprecated */
  component?: FilterPattern;
  exclude?: FilterPattern;
  excludeImporter?: FilterPattern;
  include?: FilterPattern;
  includeImporter?: FilterPattern;
  inject?: string;
  manifest?: ViteManifest;
  provide: string;
}

/**
 * Input:
 *
 * import MyComponent from "../widgets/my-component@widget.vue";
 * ...
 * <MyComponent title="My component" />
 *
 * Becomes:
 *
 * import { defineWebWidget } from "@web-widget/react";
 * const MyComponent = defineWebWidget(() => import("../widgets/my-component@widget.vue"), {
 *   base: import.meta.url,
 *   import: "asset://widgets/my-component@widget.vue"
 * });
 * ...
 * <MyComponent title="My component" />
 */
export function importRenderPlugin({
  cache = globalCache,
  component,
  exclude,
  excludeImporter,
  include,
  includeImporter = component,
  inject = 'defineWebWidget',
  manifest,
  provide,
}: ImportRenderPluginOptions): Plugin[] {
  if (typeof provide !== 'string') {
    throw new TypeError(`options.provide must be a string type.`);
  }

  let dev = false;
  let root: string;
  let filter: (id: string | unknown) => boolean;
  let importerFilter: (id: string | unknown) => boolean;
  let base: string;
  let extensions: string[] = [];
  let sourcemap: boolean;
  const assetMap: Map<string, string> = new Map();

  filter = createFilter(include, exclude);
  importerFilter = createFilter(includeImporter, excludeImporter);

  return [
    {
      name: '@web-widget:import-render',
      async configResolved(config) {
        dev = config.command === 'serve';
        root = config.root;
        base = config.base;
        sourcemap = !!config.build?.sourcemap;
      },
      async transformIndexHtml(html, { server: dev }) {
        const inspectorId = 'web-widget:inspector';
        const result: IndexHtmlTransformResult = [];

        if (!html.includes(`</web-widget>`)) {
          return result;
        }

        if (
          dev &&
          process.env.NODE_ENV !== 'test' &&
          !html.includes(`id="${inspectorId}"`)
        ) {
          const src = resolvePathToDevUrl(
            '@web-widget/web-widget/inspector',
            base
          );
          result.push({
            injectTo: 'body',
            tag: 'web-widget-inspector',
            attrs: {
              id: inspectorId,
              dir: root,
              keys: `[&quot;Shift&quot;]`,
            },
            children: [
              {
                tag: 'script',
                attrs: {
                  type: 'module',
                  src,
                },
              },
            ],
          });
        }

        return result;
      },
      async transform(code, id, { ssr } = {}) {
        if (!importerFilter(removeAs(id))) {
          return null;
        }

        let imports;

        try {
          await esModuleLexer.init;
          [imports] = esModuleLexer.parse(code, id);
        } catch (error) {
          return this.error(error as Error);
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

          const importModule = moduleName
            ? (
                await this.resolve(moduleName, id, {
                  skipSelf: true,
                })
              )?.id
            : undefined;

          if (importModule && filter(removeAs(importModule))) {
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

        for (const {
          statementStart,
          statementEnd,
          moduleId,
          moduleName,
        } of modules) {
          const importStatement = code.substring(statementStart, statementEnd);
          const importNames = extractImportBindings(importStatement);

          if (importNames.length === 0) {
            return this.error(
              new SyntaxError(
                `No valid default import found in statement:\n  ${importStatement}\n` +
                  `Please use a default import when importing web widget components.`
              ),
              statementStart
            );
          }

          if (importNames.length > 1) {
            return this.error(
              new SyntaxError(
                `Only default imports are supported for web widget components.\n` +
                  `Found multiple imports in statement:\n  ${importStatement}\n` +
                  `Please use a single default import.`
              ),
              statementStart
            );
          }

          if (importNames[0][0] !== 'default') {
            return this.error(
              new SyntaxError(
                `Only default imports are supported for web widget components.\n` +
                  `Found named import \`${importNames[0][0]}\` in statement:\n  ${importStatement}\n` +
                  `Please use a default import.`
              ),
              statementStart
            );
          }

          if (importNames[0][1] === undefined) {
            return this.error(
              new SyntaxError(
                `No alias provided for default import in statement:\n  ${importStatement}\n` +
                  `Please provide an alias for the default import.`
              ),
              statementStart
            );
          }

          const importName = importNames[0][1];
          const asset = normalizePath(path.relative(root, moduleId));

          const clientModuleId = dev
            ? // dev
              toDevUrl(asset, base)
            : ssr
              ? // build: server
                ASSET_PLACEHOLDER + asset
              : // build: client
                this.emitFile({
                  type: 'chunk',
                  id: moduleId,
                  preserveSignature: 'allow-extension',
                  importer: id,
                });

          const clientModuleExpression =
            dev || ssr
              ? // dev || build: server
                JSON.stringify(clientModuleId)
              : // build: client
                `import.meta.ROLLUP_FILE_URL_${clientModuleId}`;
          const clientContainerOptions = {
            name: importName,
          };

          const definerName = alias(inject);
          const content =
            `import { ${inject} as ${definerName} } from ${JSON.stringify(
              provide
            )};\n` +
            `const ${importName} = /* @__PURE__ */ ${definerName}(() => import(${JSON.stringify(
              moduleName
            )}), { /*base: import.meta.url,*/ import: ${clientModuleExpression}, ${JSON.stringify(
              clientContainerOptions
            ).replaceAll(/^\{|\}$/g, '')} });\n`;

          magicString.update(statementStart, statementEnd, content);
        }

        return {
          code: magicString.toString(),
          map: sourcemap ? magicString.generateMap() : null,
        };
      },
    },
    {
      apply: (userConfig, { command }) => {
        return command === 'build' && !!userConfig.build?.ssr;
      },
      name: '@web-widget:resolve-asset-protocol',
      enforce: 'post',
      async configResolved(config) {
        if (!manifest) {
          const api = getWebRouterPluginApi(config);
          if (api) {
            manifest = await getManifest(root, api.config);
          }
        }

        if (!manifest) {
          throw new Error(`Missing manifest.`);
        }

        Object.entries(manifest).forEach(([fileName, value]) => {
          if (value.file) {
            assetMap.set(fileName, value.file);
          } else if (Array.isArray(value)) {
            const file = value.find((item) => item.endsWith('.js'));
            if (file) {
              assetMap.set(fileName, file.replace(/^\//, ''));
            }
          }
        });
      },
      async transform(code, id) {
        if (!importerFilter(removeAs(id))) {
          return null;
        }
        // const normalize = (file: string) => {
        //   return !/^\.+\//.test(file) ? "./" + file : file;
        // };

        let pos: number = 0;
        const magicString = new MagicString(code);

        try {
          magicString.replace(
            ASSET_PLACEHOLDER_REG,
            (match, quotation, fileName, start) => {
              if (!fileName) {
                return match;
              }

              let asset = assetMap.get(fileName);

              if (!asset) {
                asset = extensions.find((extension) =>
                  assetMap.get(fileName + extension)
                );
              }

              if (!asset) {
                pos = start;
                throw new TypeError(
                  `Asset not found in client build manifest: "${fileName}".`
                );
              }

              return quotation + base + asset + quotation;
            }
          );
        } catch (error) {
          return this.error(error as Error, pos);
        }

        return {
          code: magicString.toString(),
          map: sourcemap ? magicString.generateMap() : null,
        };
      },
    },
  ];
}

function resolvePathToDevUrl(target: string, base: string) {
  const id = require.resolve(target);
  return `${base}@fs${id}`;
}

function relativePathToDevUrl(target: string, base: string) {
  return `${base}${target}`;
}

// @examples
// toDevUrl('App.vue', '/base/');
// toDevUrl('../App.vue', '/base');
// toDevUrl('../App.vue?as=jsx', '/base');
// toDevUrl('/www/dev/App.vue', '/base');
function toDevUrl(target: string, base: string) {
  target = target.replace(/\?.*?$/, '');
  return path.isAbsolute(target) || target.startsWith(`../`)
    ? resolvePathToDevUrl(target, base)
    : relativePathToDevUrl(target, base);
}
