import path from 'node:path';
import * as esModuleLexer from 'es-module-lexer';
import MagicString from 'magic-string';
import type { Plugin } from 'vite';
import { hasDefaultExport } from './module-exports';
import { stripModuleIdQuery, CSS_LANGS_RE } from '@/internal/module-id';
import { normalizePath } from '@/internal/path';
import { SERVER_ASSETS_MODULE_ID } from '@/internal/server-assets-module';
import { createAliasGenerator } from '@/internal/alias';

const IMPORT_DEFAULT_NAME_REG =
  /import\s+(?:([a-zA-Z_$][\w$]*)|\{\s*default\s+as\s+([a-zA-Z_$][\w$]*)\s*\})\s+from/;
const parseComponentName = (code: string) => {
  const m = code.match(IMPORT_DEFAULT_NAME_REG);
  return m?.[1] ?? m?.[2];
};

/**
 * Matches the tail of a `container(() =>` or `container(async () =>` expression.
 * Used to detect user-written `container()` calls that wrap a dynamic import.
 * `[\s\S]` allows multi-line formatting (e.g. Prettier wrapping).
 * `(^|[^\w.])` prevents matching `obj.container(...)` method calls.
 *
 * Limitation: the callee must be literally named `container` (no renamed imports).
 */
const CONTAINER_CALL_TAIL_REG =
  /(?:^|[^\w.])container\s*\([\s\S]*\(\s*\)\s*=>\s*$/;

/**
 * Extracts the variable name from `const Foo = container(...)` statements.
 *
 * Limitation: only matches `const`/`let`/`var` declarations, so
 * `render(container(() => import(...)))` yields no `name` option.
 */
const DECLARATION_NAME_REG = /(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=/g;
const parseDeclarationName = (code: string) => {
  const matches = [...code.matchAll(DECLARATION_NAME_REG)];
  return matches[matches.length - 1]?.[1];
};

export interface ImportRenderPluginOptions {
  /** Native Rust-layer filter (broad pre-filter on raw id). */
  nativeFilter: RegExp;
  /** Widget module pattern tested against query-stripped id. */
  importPattern: RegExp;
  /** Importer pattern tested against query-stripped id. */
  importerPattern: RegExp;
  /** Adapter module specifier for container injection. */
  adapterModule: string;
}

/**
 * Resolve a module specifier to an absolute id.
 */
export type ResolveFn = (
  specifier: string,
  importer: string
) => Promise<{ id: string } | null | undefined>;

/**
 * Emit a file/chunk and return a reference id.
 */
export type EmitFileFn = (file: {
  type: 'chunk';
  id: string;
  preserveSignature: 'allow-extension';
  importer: string;
}) => string;

export interface TransformWidgetImportsOptions {
  /** Source code to transform. */
  code: string;
  /** Importer module id (the file being transformed). */
  id: string;
  /** Whether in dev (serve) mode. */
  dev: boolean;
  /** Whether in server build environment. */
  isServer: boolean;
  /** Project root path. */
  root: string;
  /** Base URL prefix. */
  base: string;
  /** Whether to generate source maps. */
  sourcemap: boolean;
  /** Widget module pattern tested against query-stripped id. */
  importPattern: RegExp;
  /** Adapter module specifier for container injection. */
  adapterModule: string;
}

export interface TransformWidgetImportsContext {
  /** Resolve a module specifier to an absolute id. */
  resolve: ResolveFn;
  /** Emit a chunk file (production builds only). */
  emitFile: EmitFileFn;
}

export interface TransformResult {
  code: string;
  map: ReturnType<MagicString['generateMap']> | null;
}

/**
 * Transform widget imports into framework-native components via the
 * adapter's `container` function.
 *
 * Supports two patterns:
 *
 * 1. **Static import** (conventional):
 *    `import Foo from './Foo@widget.vue'`
 *    → converted to `const Foo = container(() => import(...), { import, name })`
 *
 * 2. **Explicit `container()` call** (for cross-framework type safety):
 *    `const Foo = container(() => import('./Foo@widget.vue'))`
 *    → `import` and `name` options are injected automatically
 *
 * For client build, the hashed chunk URL is resolved at build time via
 * `emitFile` + `import.meta.ROLLUP_FILE_URL_*`.
 * For server build, `resolveWidgetAsset(asset)` is used instead.
 */
export async function transformWidgetImports(
  ctx: TransformWidgetImportsContext,
  options: TransformWidgetImportsOptions
): Promise<TransformResult | null> {
  const { resolve, emitFile } = ctx;
  const {
    code,
    id,
    dev,
    isServer,
    root,
    base,
    sourcemap,
    importPattern,
    adapterModule,
  } = options;

  const cleanImporterId = stripModuleIdQuery(id);

  let imports;
  try {
    await esModuleLexer.init;
    [imports] = esModuleLexer.parse(code, id);
  } catch (error) {
    if (CSS_LANGS_RE.test(id)) {
      return null;
    }
    throw error;
  }

  const modules: {
    moduleId: string;
    moduleName: string;
    resolvedId: string;
    statementEnd: number;
    statementStart: number;
  }[] = [];

  /** User-written `container(() => import('./Foo@widget.vue'))` calls. */
  const containerCalls: {
    moduleId: string;
    moduleName: string;
    resolvedId: string;
    /** Start of the `container(...)` call expression. */
    containerCallStart: number;
    /** End of the module specifier string (`e` from es-module-lexer). */
    moduleSpecifierEnd: number;
  }[] = [];

  for (const importSpecifier of imports) {
    const {
      n: moduleName,
      d: dynamicImport,
      e: specifierEnd,
      ss: statementStart,
      se: statementEnd,
    } = importSpecifier;

    const importModule = moduleName
      ? (await resolve(moduleName as string, id))?.id
      : undefined;

    const cleanImportModule = importModule
      ? stripModuleIdQuery(importModule)
      : undefined;
    const importMatched = cleanImportModule
      ? importPattern.test(cleanImportModule)
      : false;
    const isSelfImport =
      cleanImportModule && cleanImportModule === cleanImporterId;
    if (importModule && importMatched) {
      if (isSelfImport) {
        continue;
      }
      if (dynamicImport !== -1) {
        // Dynamic import — only allowed inside a container() call.
        // `ss` points at the `import` keyword; we scan backward to
        // find the `container(() =>` prefix.
        // Search for `container(` (not bare `container`) to avoid
        // false positives from the word appearing in comments.
        const lookback = code.lastIndexOf('container(', statementStart);
        // Include the preceding char so the regex's `[^\w.]` guard
        // can reject `obj.container(...)`.
        const substringStart = Math.max(0, lookback - 1);
        const isInsideContainer =
          lookback !== -1 &&
          CONTAINER_CALL_TAIL_REG.test(
            code.substring(substringStart, statementStart)
          );

        if (!isInsideContainer) {
          throw new SyntaxError(
            `Widget modules can only be dynamically imported inside container().`
          );
        }

        containerCalls.push({
          moduleId: cleanImportModule ?? importModule,
          moduleName: moduleName as string,
          resolvedId: importModule,
          containerCallStart: lookback,
          moduleSpecifierEnd: specifierEnd,
        });
      } else {
        modules.push({
          moduleId: cleanImportModule ?? importModule,
          moduleName: moduleName as string,
          resolvedId: importModule,
          statementEnd,
          statementStart,
        });
      }
    }
  }

  if (modules.length === 0 && containerCalls.length === 0) {
    return null;
  }

  const magicString = new MagicString(code);
  const replacementStatements: string[] = [];
  const definerNames: string[] = [];
  let transformedContainerCalls = 0;
  const alias = createAliasGenerator();

  for (const {
    statementStart,
    statementEnd,
    moduleId,
    moduleName,
    resolvedId,
  } of modules) {
    const componentName = parseComponentName(
      code.substring(statementStart, statementEnd)
    );

    if (!componentName) {
      throw new SyntaxError(
        `Widget modules must be imported as default import. Use: import Foo from '${moduleName}'`
      );
    }

    const asset = normalizePath(path.relative(root, moduleId));

    const clientModuleExpression = buildClientModuleExpression({
      dev,
      isServer,
      asset,
      base,
      resolvedId,
      importer: id,
      emitFile,
    });

    const importProperty = clientModuleExpression
      ? `import: ${clientModuleExpression}, `
      : '';

    const definerName = alias('container');
    definerNames.push(definerName);

    replacementStatements.push(
      `const ${componentName} = /* @__PURE__ */ ${definerName}(() => import(${JSON.stringify(
        moduleName
      )}), { ${importProperty}name: ${JSON.stringify(componentName)} });`
    );

    magicString.update(statementStart, statementEnd, '');
  }

  // Inject `import` (and `name`) options into user-written
  // `container(() => import('./Foo@widget.vue'))` calls.
  for (const {
    moduleId,
    resolvedId,
    containerCallStart,
    moduleSpecifierEnd,
  } of containerCalls) {
    const asset = normalizePath(path.relative(root, moduleId));

    const clientModuleExpression = buildClientModuleExpression({
      dev,
      isServer,
      asset,
      base,
      resolvedId,
      importer: id,
      emitFile,
    });

    const componentName = parseDeclarationName(
      code.substring(0, containerCallStart)
    );

    const props = `import: ${clientModuleExpression}${
      componentName ? `, name: ${JSON.stringify(componentName)}` : ''
    }`;

    // Find the `)` that closes `import(...)`.
    let pos = moduleSpecifierEnd;
    while (pos < code.length && code[pos] !== ')') pos++;

    // Skip past `)` of import() and whitespace.
    pos++;
    while (pos < code.length && /\s/.test(code[pos])) pos++;

    if (code[pos] === ')') {
      // container(() => import('...'))  — no options, inject them.
      magicString.appendLeft(pos, `, { ${props} }`);
      transformedContainerCalls++;
    } else if (code[pos] === ',') {
      // container(() => import('...'), { ... }) — merge into options.
      pos++;
      while (pos < code.length && /\s/.test(code[pos])) pos++;
      if (code[pos] === '{') {
        if (/^\s*import\s*:/.test(code.slice(pos + 1))) {
          continue;
        }
        magicString.appendLeft(pos + 1, ` ${props},`);
        transformedContainerCalls++;
      } else {
        throw new SyntaxError(
          `Cannot inject options into container(): second argument must be an object literal.`
        );
      }
    } else {
      throw new SyntaxError(
        `Malformed container() call: expected ')' or ',' after import().`
      );
    }
  }

  if (replacementStatements.length === 0 && transformedContainerCalls === 0) {
    return null;
  }

  const header = [
    ...(isServer &&
    (replacementStatements.length > 0 || transformedContainerCalls > 0)
      ? [
          `import { resolveWidgetAsset } from ${JSON.stringify(
            SERVER_ASSETS_MODULE_ID
          )};`,
        ]
      : []),
    ...definerNames.map(
      (definerName) =>
        `import { container as ${definerName} } from ${JSON.stringify(
          adapterModule
        )};`
    ),
    '',
  ].join('\n');
  magicString.prepend(header + replacementStatements.join('\n') + '\n');

  return {
    code: magicString.toString(),
    map: sourcemap ? magicString.generateMap() : null,
  };
}

function buildClientModuleExpression({
  dev,
  isServer,
  asset,
  base,
  resolvedId,
  importer,
  emitFile,
}: {
  dev: boolean;
  isServer: boolean;
  asset: string;
  base: string;
  resolvedId: string;
  importer: string;
  emitFile: EmitFileFn;
}): string {
  if (dev) {
    return JSON.stringify(toDevUrl(asset, base));
  }
  if (isServer) {
    return `resolveWidgetAsset(${JSON.stringify(asset)})`;
  }
  return `import.meta.ROLLUP_FILE_URL_${emitFile({
    type: 'chunk',
    id: resolvedId,
    preserveSignature: 'allow-extension',
    importer,
  })}`;
}

function toDevUrl(target: string, base: string) {
  target = stripModuleIdQuery(target);
  return `${base}${target}`;
}

/**
 * Vite plugin wrapper around {@link transformWidgetImports}.
 */
export function importRenderPlugin({
  nativeFilter,
  importPattern,
  importerPattern,
  adapterModule,
}: ImportRenderPluginOptions): Plugin[] {
  if (typeof adapterModule !== 'string') {
    throw new TypeError(`options.adapterModule must be a string type.`);
  }

  let dev = false;
  let root: string;
  let base: string;
  let sourcemap: boolean;

  return [
    {
      name: '@web-widget:import-render',
      async configResolved(config) {
        dev = config.command === 'serve';
        root = config.root;
        base = config.base;
        sourcemap = !!config.build?.sourcemap;
      },
      transform: {
        filter: { id: nativeFilter },
        async handler(code, id) {
          const isServer = this.environment.config.consumer === 'server';
          const cleanImporterId = stripModuleIdQuery(id);
          if (!importerPattern.test(cleanImporterId)) {
            return null;
          }

          try {
            if (!(await hasDefaultExport(code, id))) {
              return null;
            }
            const result = await transformWidgetImports(
              {
                resolve: (specifier, importer) =>
                  this.resolve(specifier, importer, { skipSelf: true }),
                emitFile: (file) => this.emitFile(file),
              },
              {
                code,
                id,
                dev,
                isServer,
                root,
                base,
                sourcemap,
                importPattern,
                adapterModule,
              }
            );
            return result;
          } catch (error) {
            if (CSS_LANGS_RE.test(id)) {
              return null;
            }
            return this.error(error as Error);
          }
        },
      },
    },
  ];
}
