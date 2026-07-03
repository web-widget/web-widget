import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFilter, type FilterPattern } from '@rollup/pluginutils';
import * as esModuleLexer from 'es-module-lexer';
import MagicString from 'magic-string';
import type { IndexHtmlTransformResult, Plugin } from 'vite';
import { normalizeFilterId, stripModuleIdQuery } from '@/internal/module-id';
import { normalizePath } from '@/internal/path';
import { isServerEnvironment } from '@/internal/environment';
import { SERVER_ASSETS_MODULE_ID } from '@/internal/server-assets-module';

const IMPORT_DEFAULT_NAME_REG = /import\s+([a-zA-Z_$][\w$]*)\s+/;
const parseComponentName = (code: string) =>
  code.match(IMPORT_DEFAULT_NAME_REG)?.[1];

export interface ImportRenderPluginOptions {
  cache?: Set<string>;
  /** @deprecated */
  component?: FilterPattern;
  exclude?: FilterPattern;
  excludeImporter?: FilterPattern;
  include?: FilterPattern;
  includeImporter?: FilterPattern;
  inject?: string;
  provide: string;
}

/**
 * Input:
 *
 * import MyComponent from "@/widgets/my-component@widget.vue";
 * ...
 * <MyComponent title="My component" />
 *
 * Becomes (client build):
 *
 * import { defineWebWidget } from "@web-widget/react";
 * const MyComponent = defineWebWidget(() => import("../widgets/my-component@widget.vue"), {
 *   name: "MyComponent",
 * });
 * ...
 * <MyComponent title="My component" />
 *
 * For the client build, the hashed chunk URL is resolved at build time via
 * `emitFile` + `import.meta.ROLLUP_FILE_URL_*` (Rolldown replaces the
 * placeholder with `new URL(fileName, import.meta.url).href`).
 * For the server build, `resolveWidgetAsset(asset)` is used instead.
 */
export function importRenderPlugin({
  cache = new Set<string>(),
  component,
  exclude,
  excludeImporter,
  include,
  includeImporter = component,
  inject = 'defineWebWidget',
  provide,
}: ImportRenderPluginOptions): Plugin[] {
  if (typeof provide !== 'string') {
    throw new TypeError(`options.provide must be a string type.`);
  }

  let aliasIndex = 0;
  const alias = (name: string) => `__$${name}${aliasIndex++}$__`;

  let dev = false;
  let root: string;
  let filter: (id: string | unknown) => boolean;
  let importerFilter: (id: string | unknown) => boolean;
  let base: string;
  let sourcemap: boolean;
  let inspectorDevUrl: string | undefined;

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
        if (dev) {
          inspectorDevUrl = `${base}@fs${fileURLToPath(await import.meta.resolve('@web-widget/inspector'))}`;
        }
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
          const src = inspectorDevUrl ?? `${base}@fs/@web-widget/inspector`;
          result.push({
            injectTo: 'body',
            tag: 'web-widget-inspector',
            attrs: {
              id: inspectorId,
              dir: root,
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
      async transform(code, id) {
        const isServer = isServerEnvironment(this.environment);
        const normalizedImporterId = normalizeFilterId(id);
        const importerMatched = importerFilter(normalizedImporterId);
        if (!importerMatched) {
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
          resolvedId: string;
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

          const normalizedImportModule = importModule
            ? normalizeFilterId(importModule)
            : undefined;
          const importMatched = normalizedImportModule
            ? filter(normalizedImportModule)
            : false;
          const isSelfImport =
            normalizedImportModule &&
            normalizedImportModule === normalizedImporterId;
          if (importModule && importMatched) {
            if (isSelfImport) {
              continue;
            }
            if (dynamicImport !== -1) {
              return this.error(
                new SyntaxError(`Dynamic imports are not supported.`),
                statementStart
              );
            }
            const resolvedModuleId = normalizedImportModule ?? importModule;
            const cacheKey = [id, resolvedModuleId].join(',');
            if (!cache.has(cacheKey)) {
              modules.push({
                moduleId: resolvedModuleId,
                moduleName: moduleName as string,
                resolvedId: importModule,
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
        const replacementStatements: string[] = [];
        const definerNames: string[] = [];

        for (const {
          statementStart,
          statementEnd,
          moduleId,
          moduleName,
          resolvedId,
        } of modules) {
          const componentName = parseComponentName(
            code.substring(statementStart, statementEnd)
          );

          if (!componentName) {
            continue;
          }

          const asset = normalizePath(path.relative(root, moduleId));

          const clientModuleExpression = dev
            ? JSON.stringify(toDevUrl(asset, base))
            : isServer
              ? `resolveWidgetAsset(${JSON.stringify(asset)})`
              : `import.meta.ROLLUP_FILE_URL_${this.emitFile({
                  type: 'chunk',
                  id: resolvedId,
                  preserveSignature: 'allow-extension',
                  importer: id,
                })}`;

          const importProperty = clientModuleExpression
            ? `import: ${clientModuleExpression}, `
            : '';

          const clientContainerOptions = {
            name: componentName,
          };

          const definerName = alias(inject);
          definerNames.push(definerName);

          // The loader `() => import()` is kept on the client even though
          // the `<web-widget>` element uses the `import` attribute at
          // runtime. The dynamic import creates a manifest edge that the
          // CSS collection logic relies on to discover nested widget CSS.
          replacementStatements.push(
            `const ${componentName} = /* @__PURE__ */ ${definerName}(() => import(${JSON.stringify(
              moduleName
            )}), { ${importProperty}${JSON.stringify(
              clientContainerOptions
            ).replaceAll(/^\{|\}$/g, '')} });`
          );

          magicString.update(statementStart, statementEnd, '');
        }

        if (replacementStatements.length === 0) {
          return null;
        }

        const header = [
          ...(isServer
            ? [
                `import { resolveWidgetAsset } from ${JSON.stringify(
                  SERVER_ASSETS_MODULE_ID
                )};`,
              ]
            : []),
          ...definerNames.map(
            (definerName) =>
              `import { ${inject} as ${definerName} } from ${JSON.stringify(
                provide
              )};`
          ),
          '',
        ].join('\n');
        magicString.prepend(header + replacementStatements.join('\n') + '\n');

        return {
          code: magicString.toString(),
          map: sourcemap ? magicString.generateMap() : null,
        };
      },
    },
  ];
}

function toDevUrl(target: string, base: string) {
  target = stripModuleIdQuery(target);
  return `${base}${target}`;
}
