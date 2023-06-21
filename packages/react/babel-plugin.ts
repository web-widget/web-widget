/**
 * This adds component source path to JSX tags.
 *
 * == JSX Literals ==
 *
 * <MyComponent widget />
 *
 * becomes:
 *
 * <MyComponent widget={{ import: new URL("../widgets/MyComponent", import.meta.url), base: import.meta.url }} />
 */
import { declare } from '@babel/helper-plugin-utils';
import { type PluginPass, types as t } from '@babel/core';
import type { Visitor } from '@babel/traverse';
import { dirname, join } from 'node:path';
import { fileURLToPath } from "node:url";

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
                // t.newExpression(t.identifier('URL'), [
                //   {
                //     ...t.stringLiteral(source.value),
                //     // leadingComments: [{
                //     //   "type": "CommentBlock",
                //     //   "value": "@web-widget",
                //     // }]
                //   },
                //   t.memberExpression(
                //     t.metaProperty(t.identifier('import'), t.identifier('meta')),
                //     t.identifier('url'),
                //   )
                // ]),
                t.stringLiteral(source.value),
              ),

              // t.objectProperty(
              //   t.identifier('base'),
              //   t.memberExpression(
              //     t.metaProperty(t.identifier('import'), t.identifier('meta')),
              //     t.identifier('url'),
              //   )
              // ),

              // t.objectProperty(
              //   t.identifier('base'),
              //   t.logicalExpression(
              //     '??',
              //     t.optionalMemberExpression(
              //       t.optionalMemberExpression(
              //         t.metaProperty(
              //           t.identifier('import'),
              //           t.identifier('meta')
              //         ),
              //         t.identifier('env'),
              //         false,
              //         true
              //       ),
              //       t.identifier('BASE_URL'),
              //       false,
              //       true
              //     ),
              //     t.stringLiteral('/')
              //   ),
              // ),

              t.objectProperty(
                t.identifier('base'),
                t.stringLiteral(join(
                  state.filename
                  ? dirname(state.filename.replace(state.cwd, ''))
                  : '/',
                '/'))
              ),
            ]));
          }
        }
      }
    }
  };

  return {
    name: '@web-widget/react:transform-jsx',
    visitor
  };
});
