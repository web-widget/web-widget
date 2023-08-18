/**
 * This adds web-widget source path to JSX tags.
 *
 * == JSX Literals ==
 *
 * import MyComponent from "../widgets/my-component.jsx";
 * ...
 * <MyComponent as="web-widget" title="My component" />
 *
 * becomes:
 *
 * import { defineWebWidget } from "@web-widget/react/web-widget";
 * const MyComponent = defineWebWidget(() => import("../widgets/my-component.jsx"), {
 *   base: "/routes/",
 *   import: "asset://widgets/my-component.jsx",
 *   name: "MyComponent",
 *   recovering: true
 * });
 * ...
 * <MyComponent title="My component" />
 */
import { dirname, join, relative } from "node:path";
import type { DefineWebWidgetOptions } from "./web-widget";
import type { PluginPass } from "@babel/core";
import type { Visitor } from "@babel/traverse";
import { ASSET_PLACEHOLDER } from "./web-widget";
import { addNamed } from "@babel/helper-module-imports";
import { declare } from "@babel/helper-plugin-utils";
import { types as t } from "@babel/core";

const TAGNAME = "web-widget";

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

export type Config = {
  base: string;
  root: string;
  isServer: boolean;
};

export default declare((api) => {
  api.assertVersion(7);

  let config: Config;
  const visitor: Visitor<PluginPass> = {
    Program: {
      enter(path, { opts }) {
        config = opts as Config;
      },
    },
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
        const widgetAttr = attributes.find(
          (attr) =>
            t.isJSXAttribute(attr) &&
            attr.name.name === "as" &&
            t.isStringLiteral(attr.value) &&
            attr.value.value.startsWith(TAGNAME)
        ) as t.JSXAttribute;

        if (!widgetAttr) {
          return;
        }

        const mode = t.isStringLiteral(widgetAttr.value)
          ? widgetAttr.value.value.replace(TAGNAME + ":", "")
          : "";
        const loadingAttr =
          (attributes.find(
            (attr) => t.isJSXAttribute(attr) && attr.name.name === "loading"
          ) as t.JSXAttribute) || undefined;

        // Remove [as="web-widget"]
        container.openingElement.attributes =
          container.openingElement.attributes.filter(
            (attr) => attr !== widgetAttr && attr !== loadingAttr
          );

        // const base =
        //   config.base +
        //   join(relative(config.root, dirname(state.filename)), "/");
        const importDeclaration = binding.path.parent;
        const source = importDeclaration.source.value;
        const importName = addNamed(
          path,
          "defineWebWidget",
          "@web-widget/react"
        );
        const options: DefineWebWidgetOptions = {
          // base: config.base,
          import:
            ASSET_PLACEHOLDER +
            relative(config.root, join(dirname(state.filename), source)),
          name: container.openingElement.name.name,
          recovering: config.isServer && mode !== "client",
        };

        if (
          loadingAttr &&
          loadingAttr.value &&
          t.isStringLiteral(loadingAttr.value)
        ) {
          options.loading = loadingAttr.value.value;
        }

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
