/**
 * This adds component source path to JSX tags.
 *
 * == JSX Literals ==
 *
 * import MyComponent from "../widgets/my-component.jsx";
 * ...
 * <MyComponent client title="My component" />
 *
 * becomes:
 *
 * import { defineWebWidget } from "@web-widget/react/web-widget";
 * const MyComponent = defineWebWidget(() => import("../widgets/my-component.jsx"), import.meta.url, {
 *   base: "/",
 *   name: "MyComponent",
 *   recovering: true
 * });
 * ...
 * <MyComponent title="My component" />
 */
import { declare } from "@babel/helper-plugin-utils";
import { addNamed } from "@babel/helper-module-imports";
import { types as t } from "@babel/core";
import type { PluginPass } from "@babel/core";
import type { Visitor } from "@babel/traverse";
import { relative } from "node:path";
import type { Plugin, PluginOption, ResolvedConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { Options } from "@vitejs/plugin-react";
import { widgets } from "@web-widget/builder/context";
import { resolve } from "import-meta-resolve";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { DefineWebWidgetOptions } from "./web-widget";

let id = 0;
function createWidgetId() {
  return `${id++}`;
}

function createPlaceholder(file: string, importerFile: string) {
  const id = createWidgetId();
  const placeholder = `#WIDGET_PLACEHOLDER_${id}`;
  widgets.push({
    id,
    placeholder,
    file,
    importerFile,
  });
  return placeholder;
}

function createWebWidgetVariableDeclaration(
  definer: string,
  component: string,
  source: string,
  options: Record<string, any>
) {
  const getType = (object: any) =>
    Object.prototype.toString.call(object).slice(8, -1).toLocaleLowerCase();
  return t.variableDeclaration("const", [
    t.variableDeclarator(
      t.identifier(component),
      t.callExpression(t.identifier(definer), [
        t.arrowFunctionExpression(
          [],
          t.callExpression(t.import(), [t.stringLiteral(source)])
        ),
        t.memberExpression(
          t.metaProperty(t.identifier("import"), t.identifier("meta")),
          t.identifier("url")
        ),
        t.objectExpression(
          Object.keys(options).map((key) => {
            const value = options[key];
            const type = getType(value);

            switch (type) {
              case "string":
                return t.objectProperty(
                  t.identifier(key),
                  t.stringLiteral(value)
                );
              case "number":
                return t.objectProperty(
                  t.identifier(key),
                  t.numericLiteral(value)
                );
              case "boolean":
                return t.objectProperty(
                  t.identifier(key),
                  t.booleanLiteral(value)
                );
              case "null":
                return t.objectProperty(t.identifier(key), t.nullLiteral());
            }

            throw new Error(`Type not supported: ${key}=${value}`);
          })
        ),
      ])
    ),
  ]);
}

function createBabelPlugin(config: { base: string; root: string }) {
  return declare((api) => {
    api.assertVersion(7);

    const visitor: Visitor<PluginPass> = {
      JSXOpeningElement(path, state) {
        if (!state.filename) {
          return;
        }

        const name = path.node.name;
        let bindingName: string;
        if (t.isJSXIdentifier(name)) {
          bindingName = name.name;
        } else if (t.isJSXMemberExpression(name)) {
          let object = name.object;
          while (t.isJSXMemberExpression(object)) {
            object = object.object;
          }
          bindingName = object.name;
        } else if (t.isJSXNamespacedName(name)) {
          bindingName = name.namespace.name;
        } else {
          return;
        }

        const binding = path.scope.getBinding(bindingName);

        if (binding && t.isImportDeclaration(binding.path.parent)) {
          // TODO Remove: `as t.JSXElement`
          const container = path.container as t.JSXElement;

          if (!t.isJSXElement(container)) {
            return;
          }

          if (!t.isJSXIdentifier(container.openingElement.name)) {
            return;
          }

          const attributes = container.openingElement.attributes;
          const clientAttr = attributes.find(
            (attr) =>
              t.isJSXAttribute(attr) &&
              (attr.name.name === "client" || attr.name.name === "clientOnly")
          ) as t.JSXAttribute;

          if (!clientAttr) {
            return;
          }

          const importDeclaration = binding.path.parent;
          const root = config.root || state.cwd;
          const currentFilename = state.filename;
          const source = importDeclaration.source.value;
          const file = resolve(source, pathToFileURL(currentFilename).href);
          const relativeFile = relative(root, fileURLToPath(file));
          const importValue = /*config.build.ssr
            ? createPlaceholder(fileURLToPath(file), currentFilename)
            :*/ /^\.\.?\//.test(relativeFile)
            ? relativeFile
            : "./" + relativeFile;

          container.openingElement.attributes =
            container.openingElement.attributes.filter(
              (attr) => attr !== clientAttr
            );

          const options: DefineWebWidgetOptions = {
            base: config.base,
            name: container.openingElement.name.name,
            recovering: clientAttr.name.name !== "clientOnly",
          };

          if (t.isStringLiteral(clientAttr.value) && clientAttr.value.value) {
            options.loading = clientAttr.value.value;
          }

          const importName = addNamed(
            path,
            "defineWebWidget",
            "@web-widget/react"
          );

          binding.path.parentPath?.replaceWith(
            createWebWidgetVariableDeclaration(
              importName.name,
              container.openingElement.name.name,
              source,
              options
            )
          );
        }
      },
    };

    return {
      name: "@web-widget/react:web-widget",
      visitor,
    };
  });
}

export default function ReactWebWidgetVitePlugin(
  options: Options = {}
): Plugin | PluginOption {
  let config: ResolvedConfig;
  return [
    {
      name: "@web-widget/react:get-config",
      enforce: "pre",
      configResolved(resolvedConfig) {
        config = resolvedConfig;
      },
    },
    ...react({
      ...options,
      babel: {
        ...options?.babel,
        plugins: [
          // @ts-expect-error
          ...(options?.babel?.plugins || []),
          createBabelPlugin({
            get base() {
              return config.base;
            },
            get root() {
              return config.root;
            },
          }),
        ],
      },
    }),
  ];
}
