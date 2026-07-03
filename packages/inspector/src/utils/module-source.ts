function joinProjectRoot(projectRoot: string, rootRelative: string): string {
  const root = projectRoot.replace(/[/\\]+$/, '');
  const useBackslash = /\\/.test(root);
  const relative = rootRelative.replace(/^[/\\]+/, '');
  const suffix = useBackslash ? relative.replace(/\//g, '\\') : relative;
  return `${root}${useBackslash ? '\\' : '/'}${suffix}`;
}

/**
 * Resolves a canonical `x-module-source` path to an absolute filesystem path.
 */
export function resolveModuleSourcePath(
  moduleSource: string,
  projectRoot: string
): string {
  return joinProjectRoot(projectRoot, moduleSource.slice(1));
}

/**
 * Returns true when the value is a canonical dev route module source path.
 */
export function isRouteModuleSource(value: string): boolean {
  return value.startsWith('/');
}
