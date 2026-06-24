import fs from 'node:fs';
import path from 'node:path';
import * as esModuleLexer from 'es-module-lexer';
import type { DynamicImportPredicate } from '@/types';
import { isPathInsideRoot, normalizePath } from '@/internal/path';

export interface RouteClientAssets {
  cssModules: string[];
  widgetModules: string[];
}

export type RouteClientAssetsIndex = Map<string, RouteClientAssets>;

export interface CollectRouteAssetsOptions {
  root: string;
  extensions: string[];
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

function isCssPath(filePath: string): boolean {
  const pathname = stripImportQuery(filePath);
  return /\.(css|scss|sass|less|styl|module\.css)$/.test(pathname);
}

function isLocalSpecifier(specifier: string): boolean {
  return specifier.startsWith('.') || specifier.startsWith('/');
}

export function resolveLocalImport(
  specifier: string,
  importerPath: string,
  root: string,
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
  const candidates = [
    absolute,
    ...extensions.map((extension) => path.join(dir, `${name}${extension}`)),
    ...extensions.map((extension) => `${absolute}${extension}`),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  if (!isPathInsideRoot(root, absolute)) {
    return null;
  }

  return null;
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

/** Static CSS crawl stops at convention widget paths without entering widget sources. */
function isConventionWidgetCrawlBoundary(relativePath: string): boolean {
  return defaultWidgetPathMatcher(relativePath);
}

function shouldFollowDynamicImport(
  resolvedPath: string,
  relativePath: string,
  options: CollectRouteAssetsOptions
): boolean {
  return matchesWidgetModule(
    options.root,
    relativePath,
    resolvedPath,
    options.dynamicImportPredicate
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

function recordWidgetModule(
  relativePath: string,
  resolvedPath: string,
  options: CollectRouteAssetsOptions,
  widgetModules: Set<string>
): void {
  if (
    !matchesWidgetModule(
      options.root,
      relativePath,
      resolvedPath,
      options.dynamicImportPredicate
    )
  ) {
    return;
  }

  widgetModules.add(relativePath);
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

  for (const { specifier, isDynamic } of imports) {
    if (!isLocalSpecifier(specifier)) {
      continue;
    }

    const resolved = resolveLocalImport(
      specifier,
      normalizedEntry,
      options.root,
      options.extensions
    );
    if (!resolved) {
      continue;
    }

    const relativePath = toRelativeKey(options.root, resolved);
    const isDynamicImport = isDynamic;

    if (isCssPath(resolved)) {
      if (!isDynamicImport) {
        cssModules.add(relativePath);
      }
      continue;
    }

    // NOTE: CSS crawl boundary uses convention only; import filter must not widen it
    // (createFilter with no include matches all paths and would truncate the graph).
    if (isConventionWidgetCrawlBoundary(relativePath)) {
      recordWidgetModule(relativePath, resolved, options, widgetModules);
      continue;
    }

    if (
      isDynamicImport &&
      !shouldFollowDynamicImport(resolved, relativePath, options)
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

/** Static CSS reachable from a widget entry (does not stop at the widget's own path). */
export async function collectWidgetCssModules(
  widgetEntryPath: string,
  options: CollectRouteAssetsOptions
): Promise<string[]> {
  const assets = await collectRouteModuleAssets(widgetEntryPath, options);
  return assets.cssModules;
}

export async function discoverWidgetModulePaths(
  root: string,
  searchDirs: string[],
  dynamicImportPredicate?: DynamicImportPredicate
): Promise<string[]> {
  const widgets = new Set<string>();

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
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
          continue;
        }
        await walk(fullPath);
      } else if (entry.isFile()) {
        const relativePath = normalizePath(path.relative(root, fullPath));
        if (
          matchesWidgetModule(
            root,
            relativePath,
            fullPath,
            dynamicImportPredicate
          )
        ) {
          widgets.add(relativePath);
        }
      }
    }
  }

  for (const searchDir of searchDirs) {
    await walk(path.resolve(root, searchDir));
  }

  return [...widgets].sort();
}
