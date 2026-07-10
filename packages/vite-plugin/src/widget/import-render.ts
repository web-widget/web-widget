import path from 'node:path';
import * as esModuleLexer from 'es-module-lexer';
import MagicString from 'magic-string';
import type { Plugin } from 'vite';
import { stripModuleIdQuery, CSS_LANGS_RE } from '@/internal/module-id';
import { normalizePath } from '@/internal/path';
import { isServerEnvironment } from '@/internal/environment';
import { SERVER_ASSETS_MODULE_ID } from '@/internal/server-assets-module';
import { createAliasGenerator } from '@/internal/alias';

const IMPORT_DEFAULT_NAME_REG = /import\s+([a-zA-Z_$][\w$]*)\s+/;
const parseComponentName = (code: string) =>
  code.match(IMPORT_DEFAULT_NAME_REG)?.[1];

export interface ImportRenderPluginOptions {
  /** Native Rust-layer filter (broad pre-filter on raw id). */
  nativeFilter: RegExp;
  /** Widget module pattern tested against query-stripped id. */
  importPattern: RegExp;
  /** Importer pattern tested against query-stripped id. */
  importerPattern: RegExp;
  /** Runtime module specifier for container injection. */
  provide: string;
}

/**
 * Transform `import Foo from './Foo@widget.vue'` into a framework-native
 * component via the adapter's `container` function.
 *
 * For client build, the hashed chunk URL is resolved at build time via
 * `emitFile` + `import.meta.ROLLUP_FILE_URL_*`.
 * For server build, `resolveWidgetAsset(asset)` is used instead.
 */
export function importRenderPlugin({
  nativeFilter,
  importPattern,
  importerPattern,
  provide,
}: ImportRenderPluginOptions): Plugin[] {
  if (typeof provide !== 'string') {
    throw new TypeError(`options.provide must be a string type.`);
  }

  const alias = createAliasGenerator();

  let dev = false;
  let root: string;
  let base: string;
  let sourcemap: boolean;

  return [
    {
      name: '@web-widget:import-render',
      async configResolved(config) {
        dev = config.command === 'serve';
        root = config.root;
        base = config.base;
        sourcemap = !!config.build?.sourcemap;
      },
      transform: {
        filter: { id: nativeFilter },
        async handler(code, id) {
          const isServer = isServerEnvironment(this.environment);
          const cleanImporterId = stripModuleIdQuery(id);
          if (!importerPattern.test(cleanImporterId)) {
            return null;
          }

          let imports;
          try {
            await esModuleLexer.init;
            [imports] = esModuleLexer.parse(code, id);
          } catch (error) {
            // CSS modules (e.g. Vue SFC ?vue&type=style) are not parseable
            // as ESM and cannot contain import statements, skip them.
            if (CSS_LANGS_RE.test(id)) {
              return null;
            }
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

            const cleanImportModule = importModule
              ? stripModuleIdQuery(importModule)
              : undefined;
            const importMatched = cleanImportModule
              ? importPattern.test(cleanImportModule)
              : false;
            const isSelfImport =
              cleanImportModule && cleanImportModule === cleanImporterId;
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
              modules.push({
                moduleId: cleanImportModule ?? importModule,
                moduleName: moduleName as string,
                resolvedId: importModule,
                statementEnd,
                statementStart,
              });
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

            const definerName = alias('container');
            definerNames.push(definerName);

            replacementStatements.push(
              `const ${componentName} = /* @__PURE__ */ ${definerName}(() => import(${JSON.stringify(
                moduleName
              )}), { ${importProperty}name: ${JSON.stringify(componentName)} });`
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
                `import { container as ${definerName} } from ${JSON.stringify(
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
    },
  ];
}

function toDevUrl(target: string, base: string) {
  target = stripModuleIdQuery(target);
  return `${base}${target}`;
}
