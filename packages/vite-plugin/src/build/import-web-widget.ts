import path from 'node:path';
import { createRequire } from 'node:module';
import { createFilter, type FilterPattern } from '@rollup/pluginutils';
import * as esModuleLexer from 'es-module-lexer';
import MagicString from 'magic-string';
import type {
  IndexHtmlTransformResult,
  Plugin,
  Manifest as ViteManifest,
} from 'vite';
import { getManifest, getWebRouterPluginApi } from '@/utils';

export const ASSET_PROTOCOL = 'asset:';
const ASSET_PLACEHOLDER_REG = /(["'`])asset:\/\/(.*?)\1/g;
const ASSET_PLACEHOLDER = `${ASSET_PROTOCOL}//`;

let index = 0;
const alias = (name: string) => `__$${name}${index++}$__`;
const globalCache: Set<string> = new Set();
const require = createRequire(import.meta.url);
const parseComponentName = (code: string) =>
  code.match(/import\s+([a-zA-Z$_]\w*)\s+/)?.[1];

export interface ImportWebWidgetPluginOptions {
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
export function importWebWidgetPlugin({
  cache = globalCache,
  component,
  exclude,
  excludeImporter,
  include,
  includeImporter = component,
  inject = 'defineWebWidget',
  manifest,
  provide,
}: ImportWebWidgetPluginOptions): Plugin[] {
  if (typeof provide !== 'string') {
    throw new TypeError(`options.provide must be a string type.`);
  }

  let dev = false;
  let root: string;
  let filter: (id: string | unknown) => boolean;
  let importerFilter: (id: string | unknown) => boolean;
  let base: string;
  let extensions: string[] = [];
  const assetMap: Map<string, string> = new Map();

  filter = createFilter(include, exclude);
  importerFilter = createFilter(includeImporter, excludeImporter);

  return [
    {
      name: 'vite-plugin-import-web-widget',
      async configResolved(config) {
        dev = config.command === 'serve';
        root = config.root;
        base = config.base;
      },
      async transformIndexHtml(html, { server: dev }) {
        const styleId = 'web-widget:style';
        const inspectorId = 'web-widget:inspector';
        const result: IndexHtmlTransformResult = [];

        if (!html.includes(`</web-widget>`)) {
          return result;
        }

        if (!html.includes(`id="${styleId}"`)) {
          result.push({
            injectTo: 'head',
            tag: 'style',
            attrs: {
              id: styleId,
            },
            children: 'web-widget{display:contents}',
          });
        }

        if (dev && !html.includes(`id="${inspectorId}"`)) {
          const id = require.resolve('@web-widget/web-widget/inspector');
          const src = `/@fs${id}`;
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

        const widgetModules: {
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
              widgetModules.push({
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

        if (widgetModules.length === 0) {
          return null;
        }

        const magicString = new MagicString(code);

        widgetModules.forEach(
          ({ statementStart, statementEnd, moduleId, moduleName }) => {
            const componentName = parseComponentName(
              code.substring(statementStart, statementEnd)
            );

            if (!componentName) {
              return;
            }

            const asset = path.relative(root, moduleId);
            const clientModuleId = dev
              ? base + asset
              : ssr
                ? ASSET_PLACEHOLDER + asset
                : this.emitFile({
                    type: 'chunk',
                    id: moduleId,
                    preserveSignature: 'allow-extension', // "strict",
                    importer: id,
                  });

            const clientModuleExpression =
              ssr || dev
                ? JSON.stringify(clientModuleId)
                : `import.meta.ROLLUP_FILE_URL_${clientModuleId}`;
            const clientContainerOptions = {
              name: componentName,
            };

            const definerName = alias(inject);
            const content =
              `import { ${inject} as ${definerName} } from ${JSON.stringify(
                provide
              )};\n` +
              `const ${componentName} = /* @__PURE__ */ ${definerName}(() => import(${JSON.stringify(
                moduleName
              )}), { /*base: import.meta.url,*/ import: ${clientModuleExpression}, ${JSON.stringify(
                clientContainerOptions
              ).replaceAll(/^\{|\}$/g, '')} });\n`;

            magicString.update(statementStart, statementEnd, content);
          }
        );

        return {
          code: magicString.toString(),
          map: magicString.generateMap(),
        };
      },
    },
    {
      apply: (userConfig, { command }) => {
        return command === 'build' && !!userConfig.build?.ssr;
      },
      name: 'vite-plugin-resolve-asset-protocol',
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
        if (!importerFilter(id)) {
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
          return this.error(error, pos);
        }

        return { code: magicString.toString(), map: magicString.generateMap() };
      },
    },
  ];
}
