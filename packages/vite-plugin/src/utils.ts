import path from 'node:path';
import fs from 'node:fs/promises';
import type { Manifest, ResolvedConfig } from 'vite';
import { normalizePath } from 'vite';
import type { ImportSpecifier } from 'es-module-lexer';
import { WEB_ROUTER_PLUGIN_NAME } from './constants';
import type { ResolvedWebRouterConfig, WebRouterPlugin } from './types';

/**
 * Extracts all import names for an already parsed files.
 */
export function importsToImportNames(
  imports: Iterable<ImportSpecifier>,
  source: string
) {
  const allImportNames = [];
  for (const {
    ss: statementStart,
    se: statementEnd,
    d: dynamicImport,
  } of imports) {
    if (dynamicImport < 0) {
      const importStatement = source.substring(statementStart, statementEnd);
      const importNames = getImportNames(importStatement);
      allImportNames.push(...importNames);
    } else {
      allImportNames.push(['*']);
    }
  }
  return allImportNames;
}

/**
 * Extracts all import names from a full import statement.
 *
 * `import { html, css as litCss } from 'lit'`
 * => [[ 'html' ], [ 'css', 'litCss' ]
 */
export function getImportNames(importStatement: string) {
  const importNames: [name: string, alias?: string][] = [];

  const singleLine = importStatement.trim().replace(/\n/g, '');
  const fromIndex = singleLine.indexOf('from');
  if (fromIndex >= 0) {
    let parts: [defaultAndNamespacesPart: string, namedPart: string];

    if (importStatement.includes('{')) {
      const startsWith = importStatement.indexOf('{');
      const endsWith = importStatement.indexOf('}');
      const defaultAndNamespacesPart = importStatement.substring(6, startsWith);
      const namedPart = importStatement.substring(startsWith + 1, endsWith);
      parts = [defaultAndNamespacesPart, namedPart];
    } else {
      const index = importStatement.indexOf('from');
      const defaultAndNamespacesPart = importStatement.substring(6, index);
      parts = [defaultAndNamespacesPart, ''];
    }

    const list = parts.map((string) =>
      string
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
    );

    for (const [index, part] of list.entries()) {
      for (const importName of part) {
        if (importName.includes(' as ')) {
          const v = importName.split(' as ');
          importNames.push([v[0].trim(), v[1].trim()]);
        } else {
          const isDefault = index === 0;
          importNames.push(isDefault ? ['default', importName] : [importName]);
        }
      }
    }
  }

  return importNames;
}

export { normalizePath };

export function relativePathWithDot(from: string, to: string): string {
  let relativePath = normalizePath(path.relative(from, to));
  if (!relativePath.startsWith('./') && !relativePath.startsWith('../')) {
    return './' + relativePath;
  }
  return relativePath;
}

export function getWebRouterPluginApi(config: ResolvedConfig) {
  const webRouterPlugin = config.plugins.find(
    (p) => p.name === WEB_ROUTER_PLUGIN_NAME
  ) as WebRouterPlugin | undefined;

  return webRouterPlugin?.api;
}

export async function getManifest(
  root: string,
  { output: { dir, client, manifest } }: ResolvedWebRouterConfig
) {
  const manifestPath = path.join(root, dir, client, manifest);
  const fileContent = await fs.readFile(manifestPath, 'utf-8');
  const viteManifest = JSON.parse(fileContent) as Manifest;

  return viteManifest;
}

// https://developer.mozilla.org/docs/Web/JavaScript/Guide/Regular_expressions#escaping
export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/** Prefix Vite prepends to resolved ids that are not valid browser import specifiers. */
const VITE_VALID_ID_PREFIX = '/@id/';

/** Strip Vite `/@id/` prefix from a resolved module id. */
export function unwrapViteId(id: string): string {
  return id.startsWith(VITE_VALID_ID_PREFIX)
    ? id.slice(VITE_VALID_ID_PREFIX.length)
    : id;
}

/** Pathname-only module id (no query or hash). */
export function stripModuleIdQuery(id: string): string {
  const hashIndex = id.indexOf('#');
  const withoutHash = hashIndex >= 0 ? id.slice(0, hashIndex) : id;
  const queryIndex = withoutHash.indexOf('?');
  return queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
}

/** Canonical key for Vite module graph matching and manifest filter paths. */
export function canonicalModuleKey(id: string): string {
  return stripModuleIdQuery(unwrapViteId(id));
}

/** Relative manifest key for `createFilter`-based dynamic import predicates. */
export function toManifestFilterKey(id: string, root: string): string {
  return normalizePath(path.relative(root, canonicalModuleKey(id)));
}

export function normalizeFilterId(id: string) {
  const hashIndex = id.indexOf('#');
  const cleanId = hashIndex >= 0 ? id.slice(0, hashIndex) : id;
  const queryIndex = cleanId.indexOf('?');
  if (queryIndex < 0) {
    return cleanId;
  }

  const pathname = cleanId.slice(0, queryIndex);
  const query = cleanId.slice(queryIndex + 1);
  const normalizedQuery = query
    .split('&')
    .filter((part) => {
      if (!part) {
        return false;
      }
      const equalIndex = part.indexOf('=');
      const key = equalIndex >= 0 ? part.slice(0, equalIndex) : part;
      return key !== 'as' && key !== 'import' && key !== 't' && key !== 'v';
    })
    .join('&');
  return normalizedQuery ? `${pathname}?${normalizedQuery}` : pathname;
}
