import * as esModuleLexer from "es-module-lexer";
import type { Plugin as VitePlugin } from "vite";
import { relative } from "node:path";
import { createFilter, type FilterPattern } from "@rollup/pluginutils";
import MagicString from "magic-string";

export const ASSET_PLACEHOLDER = "asset://";

let index = 0;
const alias = (name: string) => `__$${name}${index++}$__`;
const globalCache: Set<string> = new Set();

export interface WebWidgetToComponentPluginOptions {
  cache?: Set<string>;
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
}

/**
 * Input:
 *
 * import MyComponent from "../widgets/my-component.widget.jsx";
 * ...
 * <MyComponent title="My component" />
 *
 * Becomes:
 *
 * import { defineWebWidget } from "@web-widget/react";
 * const MyComponent = defineWebWidget(() => import("../widgets/my-component.widget.jsx"), {
 *   import: "asset://widgets/my-component.widget.jsx",
 *   recovering: true
 * });
 * ...
 * <MyComponent title="My component" />
 */
export function webWidgetToComponentPlugin({
  cache = globalCache,
  provide,
  inject = "defineWebWidget",
  component,
  include = /\.(widget|route)\.[^.]*$/,
  exclude,
}: WebWidgetToComponentPluginOptions): VitePlugin {
  if (typeof provide !== "string") {
    throw new TypeError(`options.provide: must be a string type.`);
  }

  // let dev = false;
  let root: string;
  // let base: string;
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
      // dev = resolvedConfig.command === "serve";
      // base = resolvedConfig.base;
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
        return null;
      }

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
          const cacheKey = [id, importModule].join(",");
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

          const asset = relative(root, moduleId);
          const clientModuleId = ssr
            ? ASSET_PLACEHOLDER + asset
            : this.emitFile({
                type: "chunk",
                id: moduleId,
              });
          const clientModuleExpression = ssr
            ? JSON.stringify(clientModuleId)
            : `import.meta.ROLLUP_FILE_URL_${clientModuleId}`;
          const clientContainerOptions = {
            // import: dev ? base + asset : ASSET_PLACEHOLDER + asset,
            recovering: ssr ? true : false,
            renderTarget: "light",
          };

          const definerName = alias(inject);
          const content =
            `import { ${inject} as ${definerName} } from ${JSON.stringify(
              provide
            )};\n` +
            `const ${componentName} = ${definerName}(() => import(${JSON.stringify(
              moduleName
            )}), { base:import.meta.url,import: ${clientModuleExpression}, ${JSON.stringify(
              clientContainerOptions
            ).replaceAll(/^\{|\}$/g, "")} });\n`;

          magicString.update(statementStart, statementEnd, content);
        }
      );

      return { code: magicString.toString(), map: magicString.generateMap() };
    },
  };
}
