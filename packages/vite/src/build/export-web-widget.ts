import { createFilter, type FilterPattern } from "@rollup/pluginutils";
import * as esModuleLexer from "es-module-lexer";
import MagicString from "magic-string";
import type { Plugin } from "vite";
import { defineAsyncOptions } from "../container";
import type { AppendWebWidgetMetaPluginOptions } from "./append-web-widget-meta";
import { appendWebWidgetMetaPlugin } from "./append-web-widget-meta";

const alias = (name: string) => `__$${name}$__`;

export interface ExportWidgetPluginOptions {
  destructuringExportDefault?: boolean | { exclude: string[] };
  exclude?: FilterPattern;
  include?: FilterPattern;
  inject?: string | string[];
  manifest?: AppendWebWidgetMetaPluginOptions["manifest"];
  provide: string;
}

export function exportWebWidgetPlugin(
  options: ExportWidgetPluginOptions
): Plugin[] {
  let filter: (id: string | unknown) => boolean;
  const [
    appendWebWidgetMetaPluginOptions,
    setAppendWebWidgetMetaPluginOptions,
  ] = defineAsyncOptions<AppendWebWidgetMetaPluginOptions>({});
  return [
    {
      name: "builder:export-web-widget",
      async config(userConfig) {
        const ssrBuild = !!userConfig.build?.ssr;
        const {
          exclude,
          include, // = /(?:\.|@)(?:widget|route)\..*$/,
          manifest,
          provide,
        } = options;
        filter = createFilter(include, exclude);

        if (typeof provide !== "string") {
          throw new TypeError(`options.provide must be a string type.`);
        }

        if (ssrBuild && !manifest) {
          throw new Error(`options.manifest is required to build ssr.`);
        }

        setAppendWebWidgetMetaPluginOptions({
          exclude,
          include,
          manifest: manifest || {},
        });
      },
      async transform(code, id) {
        if (!filter(id)) {
          return null;
        }

        const {
          inject = ["render"],
          destructuringExportDefault,
          provide,
        } = options;
        const injects = Array.isArray(inject) ? inject : [inject];

        await esModuleLexer.init;
        const [, exports] = esModuleLexer.parse(code, id);
        const magicString = new MagicString(code);

        if (destructuringExportDefault) {
          const excludeDestructuringExportDefault =
            typeof destructuringExportDefault === "object"
              ? destructuringExportDefault.exclude
              : [];
          const defaultExportSpecifier = exports.find(
            ({ n }) => n === "default"
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
            `const ${alias("default")} =`
          );

          injects.forEach((exportName) => {
            if (!exports.some(({ n: name }) => name === exportName)) {
              magicString.prepend(
                `import { ${exportName} as ${alias(
                  exportName
                )} } from ${JSON.stringify(provide)};\n`
              );

              if (!excludeDestructuringExportDefault?.includes(exportName)) {
                magicString.append(
                  `\nexport const { ${exportName} = ${alias(
                    exportName
                  )} } = ${alias("default")};`
                );
              } else {
                magicString.append(
                  `\nexport const ${exportName} = ${alias(exportName)};`
                );
              }
            }
          });

          magicString.append(`\nexport default ${alias("default")};`);
        } else {
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
        }

        return {
          code: magicString.toString(),
          map: magicString.generateMap(),
        };
      },
    },
    {
      ...appendWebWidgetMetaPlugin(appendWebWidgetMetaPluginOptions),
      apply: (userConfig, { command }) => {
        return command === "build" && !!userConfig.build?.ssr;
      },
    },
  ];
}
