import * as esModuleLexer from "es-module-lexer";
import type { Plugin as VitePlugin } from "vite";
import { dirname, join, relative } from "node:path";
import { createFilter, type FilterPattern } from "@rollup/pluginutils";
import MagicString from "magic-string";

export const ASSET_PLACEHOLDER = "asset://";

let index = 0;
const alias = (name: string) => `__$${name}${index++}$__`;

export type WidgetToComponentPluginOptions = {
  provide: string;
  inject?: string;
  component?:
    | FilterPattern
    | {
        include?: FilterPattern;
        exclude?: FilterPattern;
      };
  include?: FilterPattern;
  exclude?: FilterPattern;
};

/**
 * Input:
 *
 * import MyComponent from "../widgets/my-component.widget.jsx";
 * ...
 * <MyComponent title="My component" />
 *
 * Becomes:
 *
 * import { defineWebWidget } from "@web-widget/react/web-widget";
 * const MyComponent = defineWebWidget(() => import("../widgets/my-component.widget.jsx"), {
 *   import: "asset://widgets/my-component.widget.jsx",
 *   recovering: true
 * });
 * ...
 * <MyComponent title="My component" />
 */
export function widgetToComponentPlugin({
  provide,
  inject = "defineWebWidget",
  component,
  include = /\.(widget|route)\.[^.]*$/,
  exclude,
}: WidgetToComponentPluginOptions): VitePlugin {
  let dev = false;
  let root: string;
  let base: string;
  const filter = createFilter(include, exclude);
  const componentFilterPatterns =
    component !== null &&
    typeof component === "object" &&
    Reflect.has(component, "include")
      ? [Reflect.get(component, "include"), Reflect.get(component, "exclude")]
      : [component];
  const componentFilter = createFilter(...componentFilterPatterns);
  const parseComponentName = (code: string) =>
    code.match(/import\s+([a-zA-Z$_]\w*)\s+/)?.[1];
  const importedWidgetComponents = new Set();

  return {
    name: "builder:web-widget-to-component",
    configResolved(resolvedConfig) {
      dev = resolvedConfig.command === "serve";
      base = resolvedConfig.base;
      root = resolvedConfig.root;
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
        return;
      }

      await esModuleLexer.init;
      const [imports] = esModuleLexer.parse(code, id);
      const widgetModules: {
        statementStart: number;
        statementEnd: number;
        moduleName: string;
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
          widgetModules.push({
            moduleName: moduleName as string,
            statementStart: importSpecifier.ss,
            statementEnd: importSpecifier.se,
          });
        }
      }

      if (widgetModules.length === 0) {
        return null;
      }

      const magicString = new MagicString(code);

      widgetModules.forEach(({ statementStart, statementEnd, moduleName }) => {
        const componentName = parseComponentName(
          code.substring(statementStart, statementEnd)
        );

        if (!componentName) {
          return;
        }

        const asset = relative(root, join(dirname(id), moduleName));
        const clientContainerOptions = {
          import: dev ? base + asset : ASSET_PLACEHOLDER + asset,
          recovering: ssr ? true : false,
        };

        const definerName = alias(inject);
        const content =
          `import { ${inject} as ${definerName} } from ${JSON.stringify(
            provide
          )};\n` +
          `const ${componentName} = ${definerName}(() => import(${JSON.stringify(
            moduleName
          )}), ${JSON.stringify(clientContainerOptions)});\n`;

        magicString.update(statementStart, statementEnd, content);
      });

      return { code: magicString.toString(), map: magicString.generateMap() };
    },
  };
}
