import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import * as esModuleLexer from 'es-module-lexer';
import type { WidgetModuleFilter } from '@/types';
import { normalizePath } from '@/internal/path';
import { CSS_LANGS_RE } from '@/internal/module-id';

export interface RouteClientAssets {
  cssModules: string[];
  widgetModules: string[];
}

export interface CollectRouteAssetsOptions {
  root: string;
  /**
   * Delegate module resolution to the host (Rollup `this.resolve` in
   * `transform`, or Vite `serverEnvironment.resolveId` in dev) so alias /
   * tsconfig paths / third-party resolveId plugins are honored. When omitted,
   * falls back to local specifier resolution (relative/absolute paths only).
   */
  resolveId?: (specifier: string, importer: string) => Promise<string | null>;
  /** From `webWidgetPlugin` `import.include/exclude`; also drives static widget discovery. */
  widgetModuleFilter?: WidgetModuleFilter;
  /** Shared caches to memoize read/parse/resolve across routes with common deps. */
  caches?: RouteAssetCaches;
}

/** Shared caches for route asset collection. Resolver-scoped (one per resolveId impl). */
export interface RouteAssetCaches {
  source: Map<string, string>;
  parsedImports: Map<string, ParsedImport[]>;
  resolved: Map<string, string | null>;
  exists: Map<string, boolean>;
}

export function createRouteAssetCaches(): RouteAssetCaches {
  return {
    source: new Map(),
    parsedImports: new Map(),
    resolved: new Map(),
    exists: new Map(),
  };
}

const DEFAULT_EXTENSIONS = [
  '.mjs',
  '.js',
  '.mts',
  '.ts',
  '.jsx',
  '.tsx',
  '.vue',
  '.json',
];

function isLocalSpecifier(specifier: string): boolean {
  return specifier.startsWith('.') || specifier.startsWith('/');
}

/**
 * Resolve local specifiers (relative/absolute) without a host resolver.
 * Used when no `resolveId` callback is available (e.g. during config phase
 * before Rollup/Vite is initialized). Does NOT honor alias / tsconfig paths.
 */
export function resolveLocalImport(
  specifier: string,
  importerPath: string,
  extensions: string[] = DEFAULT_EXTENSIONS
): string | null {
  if (!isLocalSpecifier(specifier)) {
    return null;
  }

  const bare = stripImportQuery(specifier);
  const absolute = path.isAbsolute(bare)
    ? bare
    : path.resolve(path.dirname(importerPath), bare);

  if (fs.existsSync(absolute)) {
    const stat = fs.statSync(absolute);
    if (stat.isFile()) {
      return absolute;
    }
  }

  // Append extensions to the full path, matching Vite's resolver behavior
  // (e.g. `./baseLayout.html` → `baseLayout.html.ts`).
  for (const ext of extensions) {
    const candidate = absolute + ext;
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const indexCandidates = extensions.map((ext) =>
    path.join(absolute, `index${ext}`)
  );
  for (const candidate of indexCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function createDefaultResolver(
  root: string
): (specifier: string, importer: string) => Promise<string | null> {
  // Bare specifiers (e.g. workspace packages like
  // `@playgrounds/web-router-vue3/Github@widget.vue`) can't be resolved by
  // `resolveLocalImport`. Use Node module resolution (createRequire) so they
  // resolve to the symlinked workspace package directory.
  let nodeRequire: NodeRequire | null = null;
  try {
    nodeRequire = createRequire(path.join(root, 'package.json'));
  } catch {
    // root has no package.json; bare specifiers can't be resolved
  }

  return async (specifier, importer) => {
    const local = resolveLocalImport(specifier, importer, DEFAULT_EXTENSIONS);
    if (local) {
      return local;
    }
    if (!isLocalSpecifier(specifier) && nodeRequire) {
      const bare = stripImportQuery(specifier);
      try {
        return nodeRequire.resolve(bare, { paths: [path.dirname(importer)] });
      } catch {
        return null;
      }
    }
    return null;
  };
}

function unwrapImportSpecifier(specifier: string): string {
  const trimmed = specifier.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function stripImportQuery(specifier: string): string {
  const queryIndex = specifier.indexOf('?');
  return queryIndex >= 0 ? specifier.slice(0, queryIndex) : specifier;
}

export function isCssPath(filePath: string): boolean {
  const pathname = stripImportQuery(filePath);
  return CSS_LANGS_RE.test(pathname);
}

function toRelativeKey(root: string, absolutePath: string): string {
  return normalizePath(path.relative(root, absolutePath));
}

export function defaultWidgetPathMatcher(relativePath: string): boolean {
  return /[.@]widget\./.test(relativePath);
}

/** Whether a module path matches the widget import filter (or `[.@]widget.` by default). */
export function matchesWidgetModule(
  root: string,
  relativePath: string,
  resolvedPath: string,
  widgetModuleFilter?: WidgetModuleFilter
): boolean {
  if (!widgetModuleFilter) {
    return defaultWidgetPathMatcher(relativePath);
  }

  const normalized = normalizePath(relativePath);
  return (
    widgetModuleFilter(normalized) ||
    widgetModuleFilter(resolvedPath) ||
    widgetModuleFilter(path.resolve(root, normalized))
  );
}

interface ParsedImport {
  specifier: string;
  isDynamic: boolean;
}

// Negative lookbehind excludes `@import` (Less/CSS syntax), matching only ES imports
const STATIC_IMPORT_RE =
  /(?<![@\w$])import\s+(?:type\s+)?(?:[\w$*\s{},]+?\s+from\s+)?['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT_RE = /(?<![@\w$])import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function parseImportsFallback(source: string): ParsedImport[] {
  const imports: ParsedImport[] = [];

  for (const match of source.matchAll(STATIC_IMPORT_RE)) {
    if (match[1]) {
      imports.push({ specifier: match[1], isDynamic: false });
    }
  }

  for (const match of source.matchAll(DYNAMIC_IMPORT_RE)) {
    if (match[1]) {
      imports.push({ specifier: match[1], isDynamic: true });
    }
  }

  return imports;
}

async function parseImports(
  source: string,
  id: string
): Promise<ParsedImport[]> {
  await esModuleLexer.init;
  try {
    const [imports] = esModuleLexer.parse(source, id);
    return imports.map((entry) => ({
      specifier: unwrapImportSpecifier(source.slice(entry.s, entry.e)),
      isDynamic: entry.d > -1,
    }));
  } catch {
    return parseImportsFallback(source);
  }
}

async function crawlRouteModule(
  entryPath: string,
  options: CollectRouteAssetsOptions,
  cssModules: Set<string>,
  widgetModules: Set<string>,
  visited: Set<string>,
  caches: RouteAssetCaches
): Promise<void> {
  const normalizedEntry = path.normalize(entryPath);
  if (visited.has(normalizedEntry)) {
    return;
  }
  visited.add(normalizedEntry);

  let exists = caches.exists.get(normalizedEntry);
  if (exists === undefined) {
    exists = fs.existsSync(normalizedEntry);
    caches.exists.set(normalizedEntry, exists);
  }
  if (!exists) {
    return;
  }

  let source = caches.source.get(normalizedEntry);
  if (source === undefined) {
    source = await fs.promises.readFile(normalizedEntry, 'utf-8');
    caches.source.set(normalizedEntry, source);
  }

  let imports = caches.parsedImports.get(normalizedEntry);
  if (imports === undefined) {
    imports = await parseImports(source, normalizedEntry);
    caches.parsedImports.set(normalizedEntry, imports);
  }

  const resolve = options.resolveId ?? createDefaultResolver(options.root);

  for (const { specifier, isDynamic } of imports) {
    const resolveKey = `${specifier}::${normalizedEntry}`;
    let resolved = caches.resolved.get(resolveKey);
    if (resolved === undefined) {
      try {
        resolved = await resolve(specifier, normalizedEntry);
      } catch {
        resolved = null;
      }
      caches.resolved.set(resolveKey, resolved);
    }
    if (!resolved) {
      continue;
    }

    // Strip query parameters (e.g. `?vue&type=style`) from the
    // resolved path so module keys align with Vite client manifest keys,
    // which never include import queries.
    const resolvedNoQuery = stripImportQuery(resolved);
    const relativePath = toRelativeKey(options.root, resolvedNoQuery);

    if (isCssPath(resolved)) {
      if (!isDynamic) {
        cssModules.add(relativePath);
      }
      continue;
    }

    // Stop at convention widget boundaries — widget internals are handled by
    // the client build (widgets are independent manifest entries).
    if (defaultWidgetPathMatcher(relativePath)) {
      if (
        matchesWidgetModule(
          options.root,
          relativePath,
          resolved,
          options.widgetModuleFilter
        )
      ) {
        widgetModules.add(relativePath);
      }
      continue;
    }

    if (
      isDynamic &&
      !matchesWidgetModule(
        options.root,
        relativePath,
        resolved,
        options.widgetModuleFilter
      )
    ) {
      continue;
    }

    await crawlRouteModule(
      resolved,
      options,
      cssModules,
      widgetModules,
      visited,
      caches
    );
  }
}

export async function collectRouteModuleAssets(
  entryPath: string,
  options: CollectRouteAssetsOptions
): Promise<RouteClientAssets> {
  const cssModules = new Set<string>();
  const widgetModules = new Set<string>();
  const caches = options.caches ?? createRouteAssetCaches();
  await crawlRouteModule(
    entryPath,
    options,
    cssModules,
    widgetModules,
    new Set(),
    caches
  );

  return {
    cssModules: [...cssModules].sort(),
    widgetModules: [...widgetModules].sort(),
  };
}
