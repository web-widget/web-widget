import fs from 'node:fs';
import path from 'node:path';
import * as esModuleLexer from 'es-module-lexer';
import type { DynamicImportPredicate } from '@/types';
import { normalizePath } from '@/internal/path';

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
  dynamicImportPredicate?: DynamicImportPredicate;
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

  const { dir, name } = path.parse(absolute);
  const candidates = extensions.map((ext) => path.join(dir, name + ext));
  for (const candidate of candidates) {
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
  return async (specifier, importer) =>
    resolveLocalImport(specifier, importer, DEFAULT_EXTENSIONS);
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
  return /\.(css|scss|sass|less|styl)$/.test(pathname);
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
  dynamicImportPredicate?: DynamicImportPredicate
): boolean {
  if (!dynamicImportPredicate) {
    return defaultWidgetPathMatcher(relativePath);
  }

  const normalized = normalizePath(relativePath);
  return (
    dynamicImportPredicate(normalized) ||
    dynamicImportPredicate(resolvedPath) ||
    dynamicImportPredicate(path.resolve(root, normalized))
  );
}

interface ParsedImport {
  specifier: string;
  isDynamic: boolean;
}

const STATIC_IMPORT_RE =
  /import\s+(?:type\s+)?(?:[\w$*\s{},]+?\s+from\s+)?['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT_RE = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

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
  visited: Set<string>
): Promise<void> {
  const normalizedEntry = path.normalize(entryPath);
  if (visited.has(normalizedEntry)) {
    return;
  }
  visited.add(normalizedEntry);

  if (!fs.existsSync(normalizedEntry)) {
    return;
  }

  const source = await fs.promises.readFile(normalizedEntry, 'utf-8');
  const imports = await parseImports(source, normalizedEntry);
  const resolve = options.resolveId ?? createDefaultResolver(options.root);

  for (const { specifier, isDynamic } of imports) {
    let resolved: string | null;
    try {
      resolved = await resolve(specifier, normalizedEntry);
    } catch {
      continue;
    }
    if (!resolved) {
      continue;
    }

    // Strip query parameters (e.g. `?as=jsx`, `?vue&type=style`) from the
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
          options.dynamicImportPredicate
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
        options.dynamicImportPredicate
      )
    ) {
      continue;
    }

    await crawlRouteModule(
      resolved,
      options,
      cssModules,
      widgetModules,
      visited
    );
  }
}

export async function collectRouteModuleAssets(
  entryPath: string,
  options: CollectRouteAssetsOptions
): Promise<RouteClientAssets> {
  const cssModules = new Set<string>();
  const widgetModules = new Set<string>();
  await crawlRouteModule(
    entryPath,
    options,
    cssModules,
    widgetModules,
    new Set()
  );

  return {
    cssModules: [...cssModules].sort(),
    widgetModules: [...widgetModules].sort(),
  };
}

async function walkDirectory(
  root: string,
  searchDirs: string[],
  ignore: string[],
  visit: (relativePath: string, fullPath: string) => void
): Promise<void> {
  const ignored = new Set(ignore);
  async function walk(dir: string) {
    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (ignored.has(entry.name)) {
          continue;
        }
        await walk(fullPath);
      } else if (entry.isFile()) {
        const relativePath = normalizePath(path.relative(root, fullPath));
        visit(relativePath, fullPath);
      }
    }
  }

  for (const searchDir of searchDirs) {
    await walk(path.resolve(root, searchDir));
  }
}

export async function discoverCssModulePaths(
  root: string,
  searchDirs: string[],
  ignore: string[]
): Promise<string[]> {
  const cssModules = new Set<string>();
  await walkDirectory(root, searchDirs, ignore, (relativePath) => {
    if (isCssPath(relativePath)) {
      cssModules.add(relativePath);
    }
  });
  return [...cssModules].sort();
}

export async function discoverWidgetModulePaths(
  root: string,
  searchDirs: string[],
  ignore: string[],
  dynamicImportPredicate?: DynamicImportPredicate
): Promise<string[]> {
  const widgets = new Set<string>();
  await walkDirectory(root, searchDirs, ignore, (relativePath, fullPath) => {
    if (
      matchesWidgetModule(root, relativePath, fullPath, dynamicImportPredicate)
    ) {
      widgets.add(relativePath);
    }
  });
  return [...widgets].sort();
}
