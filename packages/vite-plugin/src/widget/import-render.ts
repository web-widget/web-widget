import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFilter, type FilterPattern } from '@rollup/pluginutils';
import * as esModuleLexer from 'es-module-lexer';
import MagicString from 'magic-string';
import type {
  IndexHtmlTransformResult,
  Plugin,
  Manifest as ViteManifest,
} from 'vite';
import { getManifest, getWebRouterPluginApi } from '@/internal/manifest';
import { normalizeFilterId, stripModuleIdQuery } from '@/internal/module-id';
import { normalizePath } from '@/internal/path';
import { defaultWidgetPathMatcher } from '@/internal/collect-route-assets';
import {
  applyToServerEnvironment,
  isServerEnvironment,
} from '@/internal/environment';

const ASSET_PROTOCOL = 'asset:';
const ASSET_PLACEHOLDER_REG = /(["'`])asset:\/\/(.*?)\1/g;
const ASSET_PLACEHOLDER = `${ASSET_PROTOCOL}//`;

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
  manifest?: ViteManifest;
  provide: string;
}

/**
 * Input:
 *
 * import MyComponent from "@/widgets/my-component@widget.vue";
 * ...
 * <MyComponent title="My component" />
 *
 * Becomes:
 *
 * import { defineWebWidget } from "@web-widget/react";
 * const MyComponent = defineWebWidget(() => import("../widgets/my-component@widget.vue"), {
 *   import: new URL("../widgets/my-component@widget.vue", import.meta.url).href,
 *   name: "MyComponent",
 * });
 * ...
 * <MyComponent title="My component" />
 */
export function importRenderPlugin({
  cache = new Set<string>(),
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

  let aliasIndex = 0;
  const alias = (name: string) => `__$${name}${aliasIndex++}$__`;

  let dev = false;
  let root: string;
  let filter: (id: string | unknown) => boolean;
  let importerFilter: (id: string | unknown) => boolean;
  let base: string;
  let extensions: string[] = [];
  let sourcemap: boolean;
  let inspectorDevUrl: string | undefined;
  const assetMap: Map<string, string> = new Map();
  const referencedAssets: Set<string> = new Set();

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
              ? JSON.stringify(ASSET_PLACEHOLDER + asset)
              : `new URL(${JSON.stringify(moduleName)}, import.meta.url).href`;
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
            )}), { import: ${clientModuleExpression}, ${JSON.stringify(
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
      apply: 'build',
      applyToEnvironment: applyToServerEnvironment(),
      sharedDuringBuild: true,
      name: '@web-widget:resolve-asset',
      enforce: 'post',
      async configResolved(config) {
        root = config.root;
      },
      async buildStart() {
        if (!manifest) {
          const api = getWebRouterPluginApi(this.environment.config);
          if (api) {
            manifest = await getManifest(root, api.config);
          }
        }

        if (!manifest) {
          throw new Error(`Missing manifest.`);
        }

        assetMap.clear();
        referencedAssets.clear();

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
        if (!importerFilter(normalizeFilterId(id))) {
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

              referencedAssets.add(fileName);
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
      async generateBundle() {
        if (this.environment.name !== 'ssr' || referencedAssets.size === 0) {
          return;
        }

        const orphanWidgets = [...assetMap.keys()]
          .filter((key) => defaultWidgetPathMatcher(key))
          .filter((key) => !referencedAssets.has(key));

        for (const orphan of orphanWidgets) {
          this.warn(
            `Widget "${orphan}" is registered as a client entry but not referenced by any route module. It will still be emitted; remove it from the source tree or adjust widget.searchDirs if this is unintended.`
          );
        }
      },
    },
  ];
}

function toDevUrl(target: string, base: string) {
  target = stripModuleIdQuery(target);
  return `${base}${target}`;
}
