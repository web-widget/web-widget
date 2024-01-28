import path from 'node:path';
import { createRequire } from 'node:module';
import { createFilter, type FilterPattern } from '@rollup/pluginutils';
import * as esModuleLexer from 'es-module-lexer';
import MagicString from 'magic-string';
import type { IndexHtmlTransformResult, Plugin } from 'vite';
import { defineAsyncOptions } from '../container';
import type { ResolveAssetProtocolPluginOptions } from './resolve-asset-protocol';
import { ASSET_PROTOCOL, resolveAssetProtocol } from './resolve-asset-protocol';

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
  excludeImporter?: FilterPattern;
  includeImporter?: FilterPattern;
  exclude?: FilterPattern;
  include?: FilterPattern;
  inject?: string;
  manifest?: ResolveAssetProtocolPluginOptions['manifest'];
  provide: string;
}

/**
 * Input:
 *
 * import MyComponent from "../widgets/my-component.widget.vue";
 * ...
 * <MyComponent title="My component" />
 *
 * Becomes:
 *
 * import { defineWebWidget } from "@web-widget/react";
 * const MyComponent = defineWebWidget(() => import("../widgets/my-component.widget.vue"), {
 *   base: import.meta.url,
 *   import: "asset://widgets/my-component.widget.vue"
 * });
 * ...
 * <MyComponent title="My component" />
 */
export function importWebWidgetPlugin(
  options: ImportWebWidgetPluginOptions
): Plugin[] {
  let dev = false;
  let root: string;
  let filter: (id: string | unknown) => boolean;
  let componentFilter: (id: string | unknown) => boolean;
  const importedWidgetComponents = new Set();
  let cache: Set<string>;
  let base: string;
  const [resolveAssetProtocolOptions, setResolveAssetProtocolOptions] =
    defineAsyncOptions<ResolveAssetProtocolPluginOptions>({});

  return [
    {
      name: '@widget:import-web-widget',
      async config(userConfig, { command }) {
        const ssrBuild = !!userConfig.build?.ssr;
        const {
          component,
          exclude,
          excludeImporter,
          includeImporter = component,
          include, // = /(?:\.|@)widget\..*$/,
          manifest,
          provide,
        } = options;

        cache = options.cache ?? globalCache;
        dev = command === 'serve';
        root = userConfig.root ?? process.cwd();
        filter = createFilter(include, exclude);
        componentFilter = createFilter(includeImporter, excludeImporter);

        if (typeof provide !== 'string') {
          throw new TypeError(`options.provide must be a string type.`);
        }

        if (ssrBuild && !manifest) {
          throw new Error(`options.manifest is required to build ssr.`);
        }

        setResolveAssetProtocolOptions({
          exclude: excludeImporter,
          include: includeImporter,
          manifest: manifest || {},
        });
      },
      async configResolved(config) {
        base = config.base;
      },
      async transformIndexHtml(html, { server: dev }) {
        const styleId = 'web-widget:style';
        const inspectorId = 'web-widget:inspector';
        const result: IndexHtmlTransformResult = [];

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
      async resolveId(source, importer) {
        if (importer) {
          const resolution = await this.resolve(source, importer, {
            skipSelf: true,
          });
          if (resolution && filter(resolution.id)) {
            importedWidgetComponents.add(importer);
          }
        }
      },
      async transform(code, id, { ssr } = {}) {
        if (!importedWidgetComponents.has(id) && !componentFilter(id)) {
          return null;
        }

        const { provide, inject = 'defineWebWidget' } = options;

        await esModuleLexer.init;
        const [imports] = esModuleLexer.parse(code, id);
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
      ...resolveAssetProtocol(resolveAssetProtocolOptions),
      apply: (userConfig, { command }) => {
        return command === 'build' && !!userConfig.build?.ssr;
      },
    },
  ];
}
