import path from 'node:path';
import * as esModuleLexer from 'es-module-lexer';
import MagicString from 'magic-string';
import type { Plugin } from 'vite';
import { collectRouteModuleAssets } from '@/internal/collect-route-assets';
import { getWebRouterPluginApi } from '@/internal/manifest';
import { applyToServerEnvironment } from '@/internal/environment';
import { normalizePath } from '@/internal/path';
import { normalizeFilterId as cleanId } from '@/internal/module-id';
import { SERVER_ASSETS_MODULE_ID } from '@/internal/server-assets-module';
import { createCachedAliasGenerator } from '@/internal/alias';
import { hasDefaultExport } from './module-exports';

export interface ExportRenderPluginOptions {
  /** Native Rust-layer filter (broad pre-filter on raw id). */
  nativeFilter: RegExp;
  /** Precise pattern tested against query-stripped id. */
  exportPattern: RegExp;
  /** Adapter module specifier for render injection. */
  adapterModule: string;
  /** Derive named exports from another export (route handler/meta). */
  deriveExports?: {
    name: string;
    from?: string;
    default: string;
    include?: RegExp;
  }[];
}

export function exportRenderPlugin({
  nativeFilter,
  exportPattern,
  adapterModule,
  deriveExports,
}: ExportRenderPluginOptions): Plugin[] {
  let root: string;
  let sourcemap: boolean;

  return [
    {
      name: '@web-widget:export-render',
      async configResolved(config) {
        sourcemap = !!config.build?.sourcemap;
      },
      transform: {
        filter: { id: nativeFilter },
        async handler(code, id) {
          if (!exportPattern.test(cleanId(id))) {
            return null;
          }

          await esModuleLexer.init;
          let exports;
          try {
            [, exports] = esModuleLexer.parse(code, id);
          } catch (error) {
            return this.error(
              error instanceof Error ? error : { message: String(error) }
            );
          }

          if (!exports.some(({ n }) => n === 'default')) {
            return null;
          }

          const magicString = new MagicString(code);
          const alias = createCachedAliasGenerator();

          // Inject `render` from the adapter module.
          // Use `export { alias as render }` instead of `export const render`
          // so that no local binding named `render` is introduced into user
          // code, avoiding conflicts with user-defined identifiers.
          if (!exports.some(({ n: name }) => name === 'render')) {
            const renderAlias = alias('render');
            magicString.prepend(
              `import { render as ${renderAlias} } from ${JSON.stringify(adapterModule)};\n` +
                `export { ${renderAlias} as render };\n`
            );
          }

          if (deriveExports) {
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

            const normalizedId = cleanId(id);
            deriveExports.forEach((item) => {
              const from = item.from ?? 'default';
              if (
                !exports.some(({ n: name }) => name === item.name) &&
                (!item.include || item.include.test(normalizedId))
              ) {
                // Use `const { name: alias = default } = ...; export { alias as name }`
                // so that no local binding named `item.name` is introduced,
                // avoiding conflicts with user-defined identifiers.
                const itemAlias = alias(item.name);
                magicString.append(
                  `\nconst { ${item.name}: ${itemAlias} = ${item.default} } = ${alias(
                    from
                  )};\nexport { ${itemAlias} as ${item.name} };`
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
      transform: {
        filter: { id: nativeFilter },
        async handler(code, id) {
          if (!exportPattern.test(cleanId(id))) {
            return null;
          }

          try {
            if (!(await hasDefaultExport(code, id))) {
              return null;
            }
          } catch (error) {
            return this.error(
              error instanceof Error ? error : { message: String(error) }
            );
          }

          const api = getWebRouterPluginApi(this.environment.config);
          if (!api) {
            throw new Error(
              `Missing "@web-widget/web-router" plugin. Add it before "@web-widget/vite-plugin".`
            );
          }

          const routeId = normalizePath(path.relative(root, id));

          const magicString = new MagicString(code);

          const precomputed = api.getRouteClientAssets().get(id);
          if (!precomputed) {
            await collectRouteModuleAssets(id, {
              root,
              resolveId: async (specifier, importer) => {
                const r = await this.resolve(specifier, importer);
                return r?.id ?? null;
              },
              widgetModuleFilter: api.widgetModuleFilter,
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
              `import { resolveLinks, resolveStyle } from ${JSON.stringify(
                SERVER_ASSETS_MODULE_ID
              )};\n`
            );
            magicString.append(
              [
                ``,
                `;((meta) => {`,
                `  const link = resolveLinks(${JSON.stringify(routeId)}) || [];`,
                `  meta.link ? meta.link.push(...link) : (meta.link = link);`,
                `  const style = resolveStyle(${JSON.stringify(routeId)});`,
                `  if (style) {`,
                `  meta.style ? meta.style.push({ content: style }) : (meta.style = [{ content: style }]);`,
                `  }`,
                `})(${metaExportName});`,
              ].join('\n')
            );
          } else {
            magicString.append(
              [
                ``,
                `import { resolveLinks, resolveStyle } from ${JSON.stringify(
                  SERVER_ASSETS_MODULE_ID
                )};`,
                `export const meta = (() => {`,
                `  const style = resolveStyle(${JSON.stringify(routeId)});`,
                `  return {`,
                `    link: resolveLinks(${JSON.stringify(routeId)}) || [],`,
                `    style: style ? [{ content: style }] : [],`,
                `  };`,
                `})();`,
              ].join('\n')
            );
          }

          return {
            code: magicString.toString(),
            map: sourcemap ? magicString.generateMap() : null,
          };
        },
      },
    },
  ];
}
