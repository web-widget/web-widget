import path from 'node:path';

/**
 * Converts a routemap module path (`./routes/...`) to the canonical
 * `$source` path (`/routes/...`).
 */
export function encodeModuleSource(modulePath: string): string {
  if (modulePath.startsWith('./')) {
    return modulePath.slice(1);
  }
  if (!modulePath.startsWith('/')) {
    return `/${modulePath}`;
  }
  return modulePath;
}

/**
 * Resolves a canonical module source path to an absolute file path.
 */
export function resolveModuleSourcePath(
  moduleSource: string,
  projectRoot: string
): string {
  const resolver = /\\/.test(projectRoot) ? path.win32 : path;
  return resolver.resolve(projectRoot, moduleSource.slice(1));
}
