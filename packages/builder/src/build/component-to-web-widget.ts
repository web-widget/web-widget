import * as esModuleLexer from "es-module-lexer";
import type { Plugin as VitePlugin } from "vite";
import { createFilter, type FilterPattern } from "@rollup/pluginutils";
import MagicString from "magic-string";

export interface ComponentToWebWidgetPluginOptions {
  provide: string;
  inject?: string | string[];
  destructuringExportDefault?:
    | boolean
    | {
        exclude: string[];
      };
  include?: FilterPattern;
  exclude?: FilterPattern;
}

export function componentToWebWidgetPlugin({
  provide,
  inject = ["render"],
  destructuringExportDefault,
  include = /\.(widget|route)\.[^.]*$/,
  exclude,
}: ComponentToWebWidgetPluginOptions): VitePlugin {
  if (typeof provide !== "string") {
    throw new TypeError(`options.provide: must be a string type.`);
  }

  const injects = Array.isArray(inject) ? inject : [inject];
  const filter = createFilter(include, exclude);
  const alias = (name: string) => `__$${name}$__`;
  return {
    name: "builder:component-to-web-widget",
    async transform(code, id) {
      if (!filter(id)) {
        return null;
      }

      await esModuleLexer.init;
      const [, exports] = esModuleLexer.parse(code, id);
      const magicString = new MagicString(code);

      if (destructuringExportDefault) {
        const excludeDestructuringExportDefault =
          typeof destructuringExportDefault === "object"
            ? destructuringExportDefault.exclude
            : [];
        const defaultExportSpecifier = exports.find(({ n }) => n === "default");

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
                `export const { ${exportName} = ${alias(
                  exportName
                )} } = ${alias("default")};\n`
              );
            } else {
              magicString.append(
                `export const ${exportName} = ${alias(exportName)};\n`
              );
            }

            magicString.append(`export default ${alias("default")};\n`);
          }
        });
      } else {
        injects.forEach((exportName) => {
          if (!exports.some(({ n: name }) => name === exportName)) {
            magicString.prepend(
              `export { ${exportName} } from ${JSON.stringify(provide)};\n`
            );
          }
        });
      }

      return { code: magicString.toString(), map: magicString.generateMap() };
    },
  };
}
