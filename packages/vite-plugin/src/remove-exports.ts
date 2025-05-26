import MagicString from 'magic-string';
import { Plugin } from 'vite';
import { walk, type Node } from 'estree-walker';
import { createFilter, FilterPattern } from '@rollup/pluginutils';

export interface RemoveExportsPluginOptions {
  target: string[];
  exclude?: FilterPattern;
  include?: FilterPattern;
  only?: 'server' | 'client';
}

export function removeExportsPlugin(
  { target, exclude, include, only }: RemoveExportsPluginOptions = {
    target: [],
  }
): Plugin {
  let sourcemap: boolean;
  const filter = createFilter(include, exclude);

  if (target.length === 0) {
    throw new Error('options.target: No target provided');
  }

  return {
    name: '@web-widget:remove-exports',
    enforce: 'post',
    apply: 'build',
    async configResolved(config) {
      sourcemap = !!config.build?.sourcemap;
    },
    async transform(code: string, id: string, { ssr } = {}) {
      if (only) {
        if (only === 'server' && ssr === false) {
          return;
        }
        if (only === 'client' && ssr === true) {
          return;
        }
      }

      if (!code.includes('export') || !filter(id)) {
        return;
      }

      const ast = this.parse(code);
      const magicString = new MagicString(code);
      let removed = false;

      walk(ast as Node, {
        enter(node): void {
          let start: number;
          let end: number;

          if (node.range) {
            [start, end] = node.range;
          } else {
            start = Reflect.get(node, 'start');
            end = Reflect.get(node, 'end');
          }

          if (typeof start !== 'number' || typeof end !== 'number') {
            this.skip();
            return;
          }

          if (sourcemap) {
            magicString.addSourcemapLocation(start);
            magicString.addSourcemapLocation(end);
          }
          switch (node.type) {
            case 'ExportNamedDeclaration':
              if (node.declaration) {
                if (node.declaration.type === 'VariableDeclaration') {
                  node.declaration.declarations.forEach((declaration) => {
                    if (
                      declaration.id &&
                      declaration.id.type === 'Identifier' &&
                      target.includes(declaration.id.name)
                    ) {
                      magicString.remove(start, end);
                      removed = true;
                      this.skip();
                    }
                  });
                } else if (
                  node.declaration.id &&
                  target.includes(node.declaration.id.name)
                ) {
                  magicString.remove(start, end);
                  removed = true;
                  this.skip();
                }
              } else if (node.specifiers) {
                node.specifiers.forEach((specifier) => {
                  if (target.includes(specifier.exported.name)) {
                    magicString.remove(start, end);
                    removed = true;
                    this.skip();
                  }
                });
              }
              break;
            case 'ExportDefaultDeclaration':
              if (target.includes('default')) {
                magicString.remove(start, end);
                removed = true;
                this.skip();
              }
              break;
          }
        },
      });

      if (removed) {
        return {
          code: magicString.toString(),
          map: sourcemap ? magicString.generateMap() : null,
        };
      }
    },
  };
}
