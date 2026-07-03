import path from 'node:path';

/** Must match {@link @web-widget/web-router#DEV_MODULE_SOURCE_HEADER}. */
export const DEV_MODULE_SOURCE_HEADER = 'x-module-source';

/**
 * Converts a routemap module path (`./routes/...`) to the canonical
 * `x-module-source` / `$source` path (`/routes/...`).
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
