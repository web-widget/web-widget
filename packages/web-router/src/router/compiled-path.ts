export const PARAM_SEGMENT: unique symbol = Symbol('param-segment');
export const WILDCARD_SEGMENT: unique symbol = Symbol('wildcard-segment');

export type PathToken = string | typeof PARAM_SEGMENT | typeof WILDCARD_SEGMENT;

export const LINEAR_BUCKET_LIMIT = 8;

export interface PathSegment {
  start: number;
  end: number;
}

export interface PathMatch<T> {
  route: T;
  segments: readonly PathSegment[];
}

export interface CompiledPathRoute {
  tokens: readonly PathToken[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getPathTokenBucketKey(tokens: readonly PathToken[]): string {
  const first = tokens[0];
  return typeof first === 'string' && first ? first : '';
}

export function compileLinearMatcher(tokens: readonly PathToken[]): RegExp {
  let pattern = '^';
  for (const token of tokens) {
    if (token === WILDCARD_SEGMENT) {
      pattern += '(?:/(.*))?$';
      break;
    }

    pattern += '/';
    pattern += token === PARAM_SEGMENT ? '([^/]+)' : escapeRegExp(token);
  }
  if (!pattern.endsWith('$')) pattern += '$';
  return new RegExp(pattern);
}

/**
 * Scan a pathname without materialising segment strings. The offsets are
 * shared by all trie matches and are sliced only when a result is created.
 */
export function scanPathname(pathname: string): PathSegment[] {
  if (pathname === '/' || pathname.length === 0) return [];

  const segments: PathSegment[] = [];
  let start = pathname.charCodeAt(0) === 47 ? 1 : 0;
  for (let index = start; index <= pathname.length; index++) {
    if (index !== pathname.length && pathname.charCodeAt(index) !== 47) {
      continue;
    }
    segments.push({ start, end: index });
    start = index + 1;
  }
  return segments;
}

function segmentValue(pathname: string, segment: PathSegment): string {
  return pathname.slice(segment.start, segment.end);
}

interface CompiledPathNode<T> {
  staticChildren?: Map<string, CompiledPathNode<T>>;
  paramChild?: CompiledPathNode<T>;
  routes?: T[];
  wildcardRoutes?: T[];
}

function createNode<T>(): CompiledPathNode<T> {
  return {};
}

/**
 * Immutable segment trie built from a router's registration snapshot.
 * The matcher only returns route candidates and segment offsets. Parameter
 * names remain on each terminal route so routes sharing a node can use
 * different names without changing the trie.
 */
export class CompiledPathMatcher<T extends CompiledPathRoute> {
  readonly #root = createNode<T>();

  constructor(routes: readonly T[]) {
    for (const route of routes) this.#add(route);
  }

  #add(route: T): void {
    let node = this.#root;
    for (const token of route.tokens) {
      if (token === WILDCARD_SEGMENT) {
        (node.wildcardRoutes ??= []).push(route);
        return;
      }

      if (token === PARAM_SEGMENT) {
        node = node.paramChild ??= createNode<T>();
        continue;
      }

      const children = (node.staticChildren ??= new Map());
      let child = children.get(token);
      if (!child) {
        child = createNode<T>();
        children.set(token, child);
      }
      node = child;
    }
    (node.routes ??= []).push(route);
  }

  /** Match a pathname while retaining the segment intervals for late params. */
  matchPath(
    pathname: string,
    scannedSegments: readonly PathSegment[] = scanPathname(pathname)
  ): PathMatch<T>[] {
    const segments = scannedSegments;
    const results: PathMatch<T>[] = [];
    const nodes: CompiledPathNode<T>[] = [this.#root];
    const indexes: number[] = [0];

    while (nodes.length > 0) {
      const node = nodes.pop()!;
      const index = indexes.pop()!;

      if (node.wildcardRoutes) {
        for (const route of node.wildcardRoutes) {
          results.push({ route, segments });
        }
      }

      if (index === segments.length) {
        if (node.routes) {
          for (const route of node.routes) results.push({ route, segments });
        }
        continue;
      }

      const segment = segments[index];
      const staticChild = node.staticChildren
        ? node.staticChildren.get(segmentValue(pathname, segment))
        : undefined;
      const paramChild =
        segment.start === segment.end ? undefined : node.paramChild;

      // Push parameter first so the static edge is visited first. Registration
      // order is restored by the caller after all matcher lanes are merged.
      if (paramChild) {
        nodes.push(paramChild);
        indexes.push(index + 1);
      }
      if (staticChild) {
        nodes.push(staticChild);
        indexes.push(index + 1);
      }
    }

    return results;
  }

  /** Compatibility helper for callers that already have segment strings. */
  match(segments: readonly string[]): T[] {
    const results: T[] = [];
    const nodes: CompiledPathNode<T>[] = [this.#root];
    const indexes: number[] = [0];

    while (nodes.length > 0) {
      const node = nodes.pop()!;
      const index = indexes.pop()!;
      if (node.wildcardRoutes) results.push(...node.wildcardRoutes);
      if (index === segments.length) {
        if (node.routes) results.push(...node.routes);
        continue;
      }

      const value = segments[index];
      const paramChild = value === '' ? undefined : node.paramChild;
      if (paramChild) {
        nodes.push(paramChild);
        indexes.push(index + 1);
      }
      const staticChild = node.staticChildren?.get(value);
      if (staticChild) {
        nodes.push(staticChild);
        indexes.push(index + 1);
      }
    }
    return results;
  }

  some(segments: readonly string[], predicate: (route: T) => boolean): boolean {
    const nodes: CompiledPathNode<T>[] = [this.#root];
    const indexes: number[] = [0];

    while (nodes.length > 0) {
      const node = nodes.pop()!;
      const index = indexes.pop()!;

      if (node.wildcardRoutes?.some(predicate)) return true;
      if (index === segments.length) {
        if (node.routes?.some(predicate)) return true;
        continue;
      }

      const segment = segments[index];
      const paramChild = segment === '' ? undefined : node.paramChild;
      if (paramChild) {
        nodes.push(paramChild);
        indexes.push(index + 1);
      }

      const staticChild = node.staticChildren?.get(segment);
      if (staticChild) {
        nodes.push(staticChild);
        indexes.push(index + 1);
      }
    }

    return false;
  }
}
