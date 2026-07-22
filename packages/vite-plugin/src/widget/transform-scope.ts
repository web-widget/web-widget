import path from 'node:path';
import { normalizePath } from '@rollup/pluginutils';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function scopePrefix(scopes: string[] | undefined, root: string): string {
  if (!scopes?.length) return '';
  const prefixes = scopes.map((directory) => {
    const resolved = normalizePath(path.resolve(root, directory));
    return escapeRegExp(resolved.endsWith('/') ? resolved : `${resolved}/`);
  });
  return `(?:${prefixes.join('|')})`;
}

export function transformScopePrefix(
  scopes: string[] | undefined,
  excludedScopes: string[],
  root: string
): string {
  const included = scopePrefix(scopes, root);
  if (included) return included;

  const excluded = scopePrefix(excludedScopes, root);
  return excluded ? `(?!${excluded})` : '';
}
