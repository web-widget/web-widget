import path from 'node:path';
import { normalizePath } from 'vite';

export { normalizePath };

function pathModuleFor(...paths: string[]) {
  return paths.some((value) => /\\/.test(value)) ? path.win32 : path;
}

/** Returns true when `target` resolves inside `root` (cross-platform). */
export function isPathInsideRoot(root: string, target: string): boolean {
  const resolver = pathModuleFor(root, target);
  const relative = resolver.relative(
    resolver.resolve(root),
    resolver.resolve(target)
  );
  return (
    relative === '' ||
    (!relative.startsWith('..') && !resolver.isAbsolute(relative))
  );
}

/**
 * Returns true when `child` is under `parent` after resolving both paths.
 * Uses forward slashes after {@link normalizePath} for prefix comparison.
 */
export function isPathPrefix(parent: string, child: string): boolean {
  const resolver = pathModuleFor(parent, child);
  const resolvedParent = normalizePath(resolver.resolve(parent));
  const resolvedChild = normalizePath(resolver.resolve(child));
  return (
    resolvedChild === resolvedParent ||
    resolvedChild.startsWith(`${resolvedParent}/`)
  );
}

export function relativePathWithDot(from: string, to: string): string {
  let relativePath = normalizePath(path.relative(from, to));
  if (!relativePath.startsWith('./') && !relativePath.startsWith('../')) {
    return './' + relativePath;
  }
  return relativePath;
}
