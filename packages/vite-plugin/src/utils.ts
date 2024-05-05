import path from 'node:path';
import type { ResolvedConfig } from 'vite';
import { normalizePath } from 'vite';
import type { ImportSpecifier } from 'es-module-lexer';
import { PLUGIN_NAME } from './constants';
import type { WebRouterPlugin } from './types';

/**
 * Extracts all import names for an already parsed files
 */
export function importsToImportNames(
  imports: Iterable<ImportSpecifier>,
  source: string
) {
  const allImportNames = [];
  for (const singleImport of imports) {
    const importStatement = source.substring(singleImport.ss, singleImport.se);
    const importNames = getImportNames(importStatement);
    allImportNames.push(...importNames);
  }
  return allImportNames;
}

/**
 * Extracts all import names from a full import statement
 *
 * import { html, css as litCss } from 'lit';
 * => [{ name: 'html' }, { name: 'css', alias: 'litCss' }]
 */
export function getImportNames(importStatement: string) {
  const importNames: { name: string; alias?: string }[] = [];

  const singleLine = importStatement.trim().replace(/\n/g, '');
  const fromIndex = singleLine.indexOf('from');
  if (fromIndex >= 0) {
    const importPart = singleLine.substring(6, fromIndex);
    const cleanedImportPart = importPart.replace(/[{}]/g, '');
    const importStatementParts = cleanedImportPart
      .split(',')
      .map((el) => el.trim())
      .filter(Boolean);

    for (const importName of importStatementParts) {
      if (importName.includes(' as ')) {
        const v = importName.split(' as ');
        importNames.push({
          name: v[0].trim(),
          alias: v[1].trim(),
        });
        // TODO: Handle default imports
      } else {
        importNames.push({ name: importName });
      }
    }
    return importNames;
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
  const webRouterPlugin = config.plugins.find((p) => p.name === PLUGIN_NAME) as
    | WebRouterPlugin
    | undefined;

  return webRouterPlugin?.api;
}
