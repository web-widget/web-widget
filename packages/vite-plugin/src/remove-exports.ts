import MagicString from 'magic-string';
import { Plugin } from 'vite';
import { walk } from 'estree-walker';
import { createFilter, FilterPattern } from '@rollup/pluginutils';

export interface RemoveExportsPluginOptions {
  target: string[];
  exclude?: FilterPattern;
  include?: FilterPattern;
  only?: 'server' | 'client';
}

type ParseFn = (code: string) => unknown;

/**
 * Removes `target` export names from module code. For `export { a, b } from '…'`,
 * only matching specifiers are dropped so client builds keep re-exports like `default`.
 */
export function removeTargetExports(
  code: string,
  target: string[],
  parse: ParseFn,
  sourcemap = false
): { code: string; map: ReturnType<MagicString['generateMap']> | null } | null {
  if (!code.includes('export') || target.length === 0) {
    return null;
  }

  const ast = parse(code);
  const magicString = new MagicString(code);
  let removed = false;

  walk(ast as any, {
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
          } else if (node.specifiers?.length) {
            const remaining = node.specifiers.filter(
              (specifier: { exported: { name: string } }) =>
                !target.includes(specifier.exported.name)
            );

            if (remaining.length === node.specifiers.length) {
              break;
            }

            if (remaining.length === 0) {
              magicString.remove(start, end);
            } else {
              const specifierRange = (specifier: unknown) => {
                const specStart = Reflect.get(specifier as object, 'start');
                const specEnd = Reflect.get(specifier as object, 'end');
                if (
                  typeof specStart !== 'number' ||
                  typeof specEnd !== 'number'
                ) {
                  throw new Error(
                    'Export specifier is missing source positions.'
                  );
                }
                return { start: specStart, end: specEnd };
              };
              const first = specifierRange(node.specifiers[0]);
              const last = specifierRange(
                node.specifiers[node.specifiers.length - 1]
              );
              const newList = remaining
                .map((specifier) => {
                  const { start: specStart, end: specEnd } =
                    specifierRange(specifier);
                  return code.slice(specStart, specEnd);
                })
                .join(', ');
              magicString.overwrite(first.start, last.end, newList);
            }

            removed = true;
            this.skip();
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

  if (!removed) {
    return null;
  }

  return {
    code: magicString.toString(),
    map: sourcemap ? magicString.generateMap() : null,
  };
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
    async transform(code: string, id: string, options) {
      const ssr = options?.ssr;
      if (only) {
        if (only === 'server' && ssr === false) {
          return null;
        }
        if (only === 'client' && ssr === true) {
          return null;
        }
      }

      if (!filter(id)) {
        return null;
      }

      return removeTargetExports(
        code,
        target,
        (source) => this.parse(source),
        sourcemap
      );
    },
  };
}
