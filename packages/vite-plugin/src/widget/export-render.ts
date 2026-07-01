import path from 'node:path';
import { createFilter, type FilterPattern } from '@rollup/pluginutils';
import * as esModuleLexer from 'es-module-lexer';
import MagicString from 'magic-string';
import type { Plugin } from 'vite';
import { collectRouteModuleAssets } from '@/internal/collect-route-assets';
import type { DynamicImportPredicate } from '@/types';
import { getWebRouterPluginApi } from '@/internal/manifest';
import { normalizeFilterId } from '@/internal/module-id';
import { applyToServerEnvironment } from '@/internal/environment';
import { normalizePath } from '@/internal/path';
import { SERVER_ASSETS_MODULE_ID } from '@/internal/server-assets-module';

const alias = (name: string) => `__$${name}$__`;

export interface ExportRenderPluginOptions {
  extractFromExportDefault?: {
    name: string;
    default: string;
    exclude?: FilterPattern;
    include?: FilterPattern;
  }[];
  exclude?: FilterPattern;
  include?: FilterPattern;
  inject?: string | string[];
  provide: string;
  /** From `webWidgetPlugin` `import.include` / `exclude` via `createFilter`. */
  dynamicImportPredicate: DynamicImportPredicate;
}

export function exportRenderPlugin({
  exclude,
  extractFromExportDefault,
  include,
  inject = 'render',
  provide,
  dynamicImportPredicate,
}: ExportRenderPluginOptions): Plugin[] {
  if (typeof provide !== 'string') {
    throw new TypeError(`options.provide must be a string type.`);
  }

  let root: string;
  let sourcemap: boolean;
  const filter = createFilter(include, exclude);

  return [
    {
      name: '@web-widget:export-render',
      async configResolved(config) {
        sourcemap = !!config.build?.sourcemap;
      },
      async transform(code, id) {
        if (!filter(normalizeFilterId(id))) {
          return null;
        }

        const injects = Array.isArray(inject) ? inject : [inject];

        let exports;

        try {
          await esModuleLexer.init;
          [, exports] = esModuleLexer.parse(code, id);
        } catch (error) {
          return this.error(
            error instanceof Error ? error : { message: String(error) }
          );
        }

        const magicString = new MagicString(code);

        injects.forEach((exportName) => {
          if (!exports.some(({ n: name }) => name === exportName)) {
            magicString.prepend(
              // Note: Do not use the `export { render } from "xxx"`
              // form because it may be accidentally deleted by the bundler
              `import { ${exportName} as ${alias(
                exportName
              )} } from ${JSON.stringify(provide)};\n` +
                `export const ${exportName} = ${alias(exportName)};\n`
            );
          }
        });

        if (extractFromExportDefault) {
          const defaultExportSpecifier = exports.find(
            ({ n }) => n === 'default'
          );

          if (!defaultExportSpecifier) {
            return this.error(new TypeError(`No default export found.`));
          }

          if (
            defaultExportSpecifier.ln &&
            defaultExportSpecifier.ln !== defaultExportSpecifier.n
          ) {
            return this.error(
              new TypeError(`Only the "export default" form is supported.`),
              defaultExportSpecifier.s
            );
          }

          magicString.update(
            defaultExportSpecifier.s,
            defaultExportSpecifier.e,
            `const ${alias('default')} =`
          );

          extractFromExportDefault.forEach((item) => {
            const filter = createFilter(item.include, item.exclude);
            if (
              !exports.some(({ n: name }) => name === item.name) &&
              filter(normalizeFilterId(id))
            ) {
              magicString.append(
                `\nexport const { ${item.name} = ${item.default} } = ${alias(
                  'default'
                )};`
              );
            }
          });

          magicString.append(`\nexport default ${alias('default')};`);
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

      name: '@web-widget:export-meta',
      enforce: 'post',
      async configResolved(config) {
        root = config.root;
      },
      async transform(code, id) {
        if (!filter(normalizeFilterId(id))) {
          return null;
        }

        const api = getWebRouterPluginApi(this.environment.config);
        if (!api) {
          throw new Error(
            `Missing "@web-widget/web-router" plugin. Add it before "@web-widget/vite-plugin".`
          );
        }

        // Reversed build order (server -> client): the client manifest is
        // not available during the server build, so link descriptors for
        // route modules are resolved at runtime via the
        // `virtual:web-widget-server-assets` virtual module
        // (populated after the client build completes).
        const routeId = normalizePath(path.relative(root, id));

        const magicString = new MagicString(code);

        // Use pre-computed assets from buildStart when available (O(1)),
        // otherwise fall back to real-time collection (e.g. dev mode).
        const precomputed = api.getRouteClientAssets().get(id);
        if (!precomputed) {
          await collectRouteModuleAssets(id, {
            root,
            resolveId: async (specifier, importer) => {
              const r = await this.resolve(specifier, importer);
              return r?.id ?? null;
            },
            dynamicImportPredicate,
            caches: api.getRouteAssetCaches(),
          });
        }

        await esModuleLexer.init;
        const [, exports] = esModuleLexer.parse(code, id);
        const metaExport = exports.find(({ n: name }) => name === 'meta');
        if (metaExport) {
          const { n: name, ln: localName } = metaExport;
          const metaExportName = localName ?? name;
          magicString.prepend(
            `import { resolveLinks } from ${JSON.stringify(
              SERVER_ASSETS_MODULE_ID
            )};\n`
          );
          magicString.append(
            [
              ``,
              `;((meta) => {`,
              `  const link = resolveLinks(${JSON.stringify(routeId)}) || [];`,
              `  meta.link ? meta.link.push(...link) : (meta.link = link);`,
              `})(${metaExportName});`,
            ].join('\n')
          );
        } else {
          magicString.append(
            [
              ``,
              `import { resolveLinks } from ${JSON.stringify(
                SERVER_ASSETS_MODULE_ID
              )};`,
              `export const meta = {`,
              `  link: resolveLinks(${JSON.stringify(routeId)}) || [],`,
              `};`,
            ].join('\n')
          );
        }

        return {
          code: magicString.toString(),
          map: sourcemap ? magicString.generateMap() : null,
        };
      },
    },
  ];
}
