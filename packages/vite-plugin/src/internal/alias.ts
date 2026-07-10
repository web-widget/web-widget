/**
 * Shared utilities for generating conflict-resistant identifier names
 * during code transformation.
 *
 * Generated names follow the pattern `__$<name><index>$__` (e.g.
 * `__$container0$__`, `__$render1$__`). The double-underscore + dollar-sign
 * convention is unlikely to collide with user code, and the per-generator
 * incrementing index guarantees uniqueness within a single transform.
 */

const formatAlias = (name: string, index: number): string =>
  `__$${name}${index}$__`;

/**
 * Creates a generator where **every call** returns a new unique name,
 * even for the same input `name`. Use this when each generated identifier
 * represents a distinct variable (e.g. multiple `container` imports in
 * the same file).
 *
 * @example
 * const alias = createAliasGenerator();
 * alias('container'); // __$container0$__
 * alias('container'); // __$container1$__  ← different name
 * alias('render');    // __$render2$__
 */
export function createAliasGenerator(): (name: string) => string {
  let index = 0;
  return (name: string) => formatAlias(name, index++);
}

/**
 * Creates a generator where **the same input always maps to the same
 * output** within the same generator instance. Use this when multiple
 * references to the same generated variable must stay in sync (e.g.
 * a `const` declaration and its later usages).
 *
 * @example
 * const alias = createCachedAliasGenerator();
 * alias('default'); // __$default0$__  ← first call creates the mapping
 * alias('default'); // __$default0$__  ← same name (references the same var)
 * alias('render');  // __$render1$__
 */
export function createCachedAliasGenerator(): (name: string) => string {
  let index = 0;
  const cache = new Map<string, string>();
  return (name: string) => {
    let alias = cache.get(name);
    if (alias === undefined) {
      alias = formatAlias(name, index++);
      cache.set(name, alias);
    }
    return alias;
  };
}
