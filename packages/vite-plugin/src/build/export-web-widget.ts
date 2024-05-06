import path from 'node:path';
import { createFilter, type FilterPattern } from '@rollup/pluginutils';
import * as esModuleLexer from 'es-module-lexer';
import MagicString from 'magic-string';
import type { Plugin, Manifest as ViteManifest } from 'vite';
import { getLinks } from './utils';
import { getManifest, getWebRouterPluginApi } from '@/utils';

const alias = (name: string) => `__$${name}$__`;

export interface ExportWidgetPluginOptions {
  extractFromExportDefault?: {
    name: string;
    default: string;
    exclude?: FilterPattern;
    include?: FilterPattern;
  }[];
  exclude?: FilterPattern;
  include?: FilterPattern;
  inject?: string | string[];
  manifest?: ViteManifest;
  provide: string;
}

export function exportWebWidgetPlugin({
  exclude,
  extractFromExportDefault,
  include,
  inject = 'render',
  manifest,
  provide,
}: ExportWidgetPluginOptions): Plugin[] {
  if (typeof provide !== 'string') {
    throw new TypeError(`options.provide must be a string type.`);
  }

  let base: string;
  let root: string;

  const filter = createFilter(include, exclude);

  return [
    {
      name: 'vite-plugin-@web-widget:export-render',
      async transform(code, id) {
        if (!filter(id)) {
          return null;
        }

        const injects = Array.isArray(inject) ? inject : [inject];

        let exports;

        try {
          await esModuleLexer.init;
          [, exports] = esModuleLexer.parse(code, id);
        } catch (error) {
          return this.error(error);
        }

        const magicString = new MagicString(code);

        injects.forEach((exportName) => {
          if (!exports.some(({ n: name }) => name === exportName)) {
            magicString.prepend(
              // Note: Do not use the `export { render } from "xxx"`
              // form because it may be accidentally deleted by rollup
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
              filter(id)
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
          map: magicString.generateMap(),
        };
      },
    },
    {
      apply: (userConfig, { command }) => {
        return command === 'build' && !!userConfig.build?.ssr;
      },

      name: 'vite-plugin-@web-widget:append-meta',
      enforce: 'post',
      async configResolved(config) {
        base = config.base;
        root = config.root;

        if (!manifest) {
          const api = getWebRouterPluginApi(config);
          if (api) {
            manifest = await getManifest(root, api.config);
          }
        }
      },
      async transform(code, id) {
        if (!filter(id)) {
          return null;
        }

        if (!manifest) {
          throw new Error(`Missing manifest.`);
        }

        const magicString = new MagicString(code);
        const fileName = path.relative(root, id);
        const meta = {
          link: getLinks(manifest, fileName, base, false),
        };

        await esModuleLexer.init;
        const [, exports] = esModuleLexer.parse(code, id);
        const metaExport = exports.find(({ n: name }) => name === 'meta');
        if (metaExport) {
          const { n: name, ln: localName } = metaExport;
          const metaExportName = localName ?? name;
          magicString.append(
            [
              ``,
              `;((meta) => {`,
              `  const link = ${JSON.stringify(meta.link, null, 2)};`,
              `  meta.link ? meta.link.push(...link) : (meta.link = link);`,
              `})(${metaExportName});`,
            ].join('\n')
          );
        } else {
          magicString.append(
            [
              ``,
              `export const meta = {`,
              `  link: ${JSON.stringify(meta.link)},`,
              `};`,
            ].join('\n')
          );
        }

        return { code: magicString.toString(), map: magicString.generateMap() };
      },
    },
  ];
}
