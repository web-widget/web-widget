import path from 'node:path';
import { normalizePath } from '@rollup/pluginutils';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function scopePrefix(scope: string[] | undefined, root: string): string {
  if (!scope?.length) return '';
  const prefixes = scope.map((directory) => {
    const resolved = normalizePath(path.resolve(root, directory));
    return escapeRegExp(resolved.endsWith('/') ? resolved : `${resolved}/`);
  });
  return `(?:${prefixes.join('|')})`;
}

export function transformScopePrefix(
  scope: string[] | undefined,
  excludedScopes: string[],
  root: string
): string {
  const included = scopePrefix(scope, root);
  if (included) return included;

  const excluded = scopePrefix(excludedScopes, root);
  return excluded ? `(?!${excluded})` : '';
}
