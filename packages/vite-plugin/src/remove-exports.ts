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

type ExportSpecifier = {
  exported: { name: string };
  start?: number;
  end?: number;
};

function nodeRange(node: unknown): { start: number; end: number } | null {
  const range = Reflect.get(node as object, 'range') as
    | [number, number]
    | undefined;
  if (range) {
    return { start: range[0], end: range[1] };
  }
  const start = Reflect.get(node as object, 'start');
  const end = Reflect.get(node as object, 'end');
  if (typeof start === 'number' && typeof end === 'number') {
    return { start, end };
  }
  return null;
}

function sliceNode(source: string, node: unknown): string {
  const range = nodeRange(node);
  if (!range) {
    throw new Error('AST node is missing source positions.');
  }
  return source.slice(range.start, range.end);
}

function stubExport(name: string): string {
  return `export const ${name} = void 0;\n`;
}

function stubExports(names: string[]): string {
  return names.map(stubExport).join('');
}

function partitionSpecifiers<T extends { exported: { name: string } }>(
  specifiers: T[],
  isTarget: (name: string) => boolean
) {
  const kept: T[] = [];
  const removed: T[] = [];
  for (const specifier of specifiers) {
    (isTarget(specifier.exported.name) ? removed : kept).push(specifier);
  }
  return { kept, removed };
}

/**
 * Client-build transform for route/layout modules: `target` exports become
 * `export const name = void 0`, other specifiers on the same statement stay.
 */
export function removeTargetExports(
  code: string,
  target: string[],
  parse: ParseFn,
  sourcemap = false
): { code: string; map: ReturnType<MagicString['generateMap']> | null } | null {
  if (target.length === 0 || !code.includes('export')) {
    return null;
  }

  const isTarget = (name: string) => target.includes(name);

  const ast = parse(code);
  const magicString = new MagicString(code);
  let removed = false;
  const appendedStubs = new Set<string>();

  walk(ast as any, {
    enter(node): void {
      const range = nodeRange(node);
      if (!range) {
        this.skip();
        return;
      }

      const { start, end } = range;

      if (sourcemap) {
        magicString.addSourcemapLocation(start);
        magicString.addSourcemapLocation(end);
      }

      switch (node.type) {
        case 'ExportNamedDeclaration':
          if (node.declaration) {
            if (node.declaration.type === 'VariableDeclaration') {
              const names: string[] = [];
              for (const declaration of node.declaration.declarations) {
                const id = declaration.id as { type?: string; name?: string };
                if (
                  id?.type === 'Identifier' &&
                  typeof id.name === 'string' &&
                  isTarget(id.name)
                ) {
                  names.push(id.name);
                }
              }

              if (names.length > 0) {
                magicString.overwrite(start, end, stubExports(names));
                removed = true;
                this.skip();
              }
            } else if (
              node.declaration.id &&
              isTarget(node.declaration.id.name)
            ) {
              magicString.overwrite(
                start,
                end,
                stubExport(node.declaration.id.name)
              );
              removed = true;
              this.skip();
            }
          } else if (node.specifiers?.length) {
            const { kept, removed: removedSpecifiers } = partitionSpecifiers(
              node.specifiers as ExportSpecifier[],
              isTarget
            );

            if (removedSpecifiers.length === 0) {
              break;
            }

            const isReexportFrom = !!node.source;

            if (kept.length === 0) {
              if (isReexportFrom) {
                magicString.overwrite(
                  start,
                  end,
                  stubExports(
                    removedSpecifiers.map(
                      (specifier) => specifier.exported.name
                    )
                  )
                );
              } else {
                magicString.remove(start, end);
              }
            } else {
              const list = kept
                .map((specifier) => sliceNode(code, specifier))
                .join(', ');

              if (isReexportFrom) {
                magicString.overwrite(
                  start,
                  end,
                  `export { ${list} } from ${sliceNode(code, node.source)};`
                );
                for (const specifier of removedSpecifiers) {
                  appendedStubs.add(specifier.exported.name);
                }
              } else {
                magicString.overwrite(start, end, `export { ${list} };`);
              }
            }

            removed = true;
            this.skip();
          }
          break;
        case 'ExportDefaultDeclaration':
          if (isTarget('default')) {
            magicString.remove(start, end);
            removed = true;
            this.skip();
          }
          break;
      }
    },
  });

  if (appendedStubs.size > 0) {
    magicString.append(stubExports([...appendedStubs]));
    removed = true;
  }

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
