/**
 * This adds component source path to JSX tags.
 *
 * == JSX Literals ==
 *
 * <MyComponent widget />
 *
 * becomes:
 *
 * <MyComponent widget={{ import: "../widgets/MyComponent", base: import.meta.url }} />
 */
import { declare } from '@babel/helper-plugin-utils';
import { type PluginPass, types as t } from '@babel/core';
import type { Visitor } from '@babel/traverse';

export default declare((api) => {
  api.assertVersion(7);

  const visitor: Visitor<PluginPass> = {
    JSXOpeningElement(path, state) {
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
      if (binding?.path.parent.type === 'ImportDeclaration') {
        const source = (binding?.path.parent as t.ImportDeclaration).source;
        const attributes = (path.container as t.JSXElement).openingElement
          .attributes;
        for (let i = 0; i < attributes.length; i++) {
          const name = (attributes[i] as t.JSXAttribute).name;
          if (name?.name === 'widget') {
            // TODO 保留用户原始的 props
            (attributes[i] as t.JSXAttribute).value = t.jsxExpressionContainer(t.objectExpression([
              t.objectProperty(
                t.identifier('import'),
                t.stringLiteral(source.value),
              ),
              t.objectProperty(
                t.identifier('base'),
                t.memberExpression(
                  t.metaProperty(t.identifier('import'), t.identifier('meta')),
                  t.identifier('url'),
                ),
              )
            ]));
          }
        }
      }
    }
  };

  return {
    name: 'transform-react-jsx-widget',
    visitor
  };
});
