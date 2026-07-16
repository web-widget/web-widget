/**
 * @fileoverview Radix Tree Router Implementation
 * High-performance routing using a compiled segment trie.
 */

import type { Router, Result, Params } from './base';
import { RouterUtils, CommonRouteValidation, decodePathParam } from './base';
import {
  compileLinearMatcher,
  CompiledPathMatcher,
  getPathTokenBucketKey,
  LINEAR_BUCKET_LIMIT,
  PARAM_SEGMENT,
  WILDCARD_SEGMENT,
  type PathToken,
} from './compiled-path';

interface ParamBinding {
  index: number;
  name: string;
  wildcard: boolean;
}

interface CompiledRoute<T> {
  method: string;
  handler: T;
  pathname: string;
  tokens: readonly PathToken[];
  params: readonly ParamBinding[];
  priority: string;
  score: number;
  index: number;
  isStatic: boolean;
  linearMatcher?: RegExp;
}

interface CompiledPlan<T> {
  matcher?: CompiledPathMatcher<CompiledRoute<T>>;
  linearBuckets?: Map<string, CompiledRoute<T>[]>;
  fallbackRoutes: CompiledRoute<T>[];
  shadowedStaticPaths: Set<string>;
}

const EMPTY_PARAMS = Object.freeze({}) as Params;

function compareCompiledRoutes<T>(
  left: CompiledRoute<T>,
  right: CompiledRoute<T>
): number {
  if (left.priority < right.priority) return -1;
  if (left.priority > right.priority) return 1;
  const score = right.score - left.score;
  return score === 0 ? left.index - right.index : score;
}

function materializeParams(
  route: CompiledRoute<unknown>,
  pathSegments: readonly string[]
): Params {
  if (route.params.length === 0) return EMPTY_PARAMS;

  let params: Params | undefined;
  for (const binding of route.params) {
    const encoded = binding.wildcard
      ? pathSegments.slice(binding.index).join('/')
      : pathSegments[binding.index];
    if (encoded) {
      (params ??= Object.create(null))[binding.name] = decodePathParam(encoded);
    }
  }
  return params ?? EMPTY_PARAMS;
}

function materializeFallbackParams(pathSegments: readonly string[]): Params {
  const wildcard = pathSegments.join('/');
  return wildcard ? { '*': wildcard } : EMPTY_PARAMS;
}

function materializeLinearParams(
  route: CompiledRoute<unknown>,
  match: RegExpExecArray
): Params {
  if (route.params.length === 0) return EMPTY_PARAMS;

  let params: Params | undefined;
  for (let index = 0; index < route.params.length; index++) {
    const value = match[index + 1];
    if (value) {
      (params ??= Object.create(null))[route.params[index].name] =
        decodePathParam(value);
    }
  }
  return params ?? EMPTY_PARAMS;
}

function getFirstSegment(pathname: string): string {
  const firstSlash = pathname.indexOf('/', 1);
  return firstSlash === -1 ? pathname.slice(1) : pathname.slice(1, firstSlash);
}

export class RadixTreeRouter<T> implements Router<T> {
  #routes: CompiledRoute<T>[] = [];
  #staticRoutes = new Map<string, CompiledRoute<T>[]>();
  #hasDynamicRoutes = false;
  #compiled?: CompiledPlan<T>;

  add(method: string, pathname: string, handler: T): void {
    RouterUtils.validateBasicPathname(pathname);
    CommonRouteValidation.checkDuplicateParameters(pathname);
    CommonRouteValidation.validateParameterNames(pathname);
    this.#validateRadixTreePathname(pathname);

    const normalizedPath = RouterUtils.normalizePath(pathname);
    const segments = RouterUtils.splitPath(normalizedPath);
    const tokens: PathToken[] = [];
    const params: ParamBinding[] = [];
    const priority: string[] = [];
    let score = 0;
    let isStatic = true;

    for (let index = 0; index < segments.length; index++) {
      const segment = segments[index];
      if (segment === '*') {
        tokens.push(WILDCARD_SEGMENT);
        params.push({ index, name: '*', wildcard: true });
        priority.push('2');
        score -= 100;
        isStatic = false;
        continue;
      }

      if (segment.startsWith(':')) {
        tokens.push(PARAM_SEGMENT);
        params.push({
          index,
          name: segment.slice(1),
          wildcard: false,
        });
        priority.push('1');
        score += 1;
        isStatic = false;
        continue;
      }

      tokens.push(segment);
      priority.push('0');
      score += 2;
    }

    const route: CompiledRoute<T> = {
      method,
      handler,
      pathname: normalizedPath,
      tokens,
      params,
      priority: priority.join(''),
      score: score + segments.length,
      index: this.#routes.length,
      isStatic,
    };
    this.#routes.push(route);

    if (isStatic) {
      const routes = this.#staticRoutes.get(normalizedPath);
      if (routes) routes.push(route);
      else this.#staticRoutes.set(normalizedPath, [route]);
    } else {
      this.#hasDynamicRoutes = true;
    }
    this.#compiled = undefined;
  }

  match(method: string, pathname: string): Result<T> {
    const normalizedPath = RouterUtils.normalizePath(pathname);
    const staticRoutes = this.#staticRoutes.get(normalizedPath);
    if (staticRoutes && !this.#hasDynamicRoutes) {
      return this.#matchStaticRoutes(method, staticRoutes);
    }
    if (!staticRoutes && !this.#hasDynamicRoutes) return [];

    const compiled = this.#getCompiledPlan();
    if (staticRoutes && !compiled.shadowedStaticPaths.has(normalizedPath)) {
      return this.#matchStaticRoutes(method, staticRoutes);
    }
    return this.#matchCompiled(method, normalizedPath, compiled, staticRoutes);
  }

  #getCompiledPlan(): CompiledPlan<T> {
    if (this.#compiled) return this.#compiled;

    const trieRoutes: CompiledRoute<T>[] = [];
    const dynamicBuckets = new Map<string, CompiledRoute<T>[]>();
    const fallbackRoutes: CompiledRoute<T>[] = [];
    for (const route of this.#routes) {
      if (route.isStatic) continue;
      if (route.tokens[0] === WILDCARD_SEGMENT) {
        fallbackRoutes.push(route);
        continue;
      }

      const key = getPathTokenBucketKey(route.tokens);
      const bucket = dynamicBuckets.get(key);
      if (bucket) bucket.push(route);
      else dynamicBuckets.set(key, [route]);
    }

    const useLinearMatcher = [...dynamicBuckets.values()].every(
      (routes) => routes.length <= LINEAR_BUCKET_LIMIT
    );
    let linearBuckets: Map<string, CompiledRoute<T>[]> | undefined;
    if (useLinearMatcher) {
      for (const routes of dynamicBuckets.values()) {
        for (const route of routes) {
          route.linearMatcher ??= compileLinearMatcher(route.tokens);
        }
        if (routes.length > 1) routes.sort(compareCompiledRoutes);
      }
      linearBuckets = dynamicBuckets;
    } else {
      for (const routes of dynamicBuckets.values()) trieRoutes.push(...routes);
    }

    const matcher =
      trieRoutes.length > 0 ? new CompiledPathMatcher(trieRoutes) : undefined;
    const shadowedStaticPaths = new Set<string>();
    for (const staticPath of this.#staticRoutes.keys()) {
      if (fallbackRoutes.length > 0) {
        shadowedStaticPaths.add(staticPath);
        continue;
      }
      if (matcher?.some(RouterUtils.splitPath(staticPath), () => true)) {
        shadowedStaticPaths.add(staticPath);
        continue;
      }
      if (
        linearBuckets &&
        this.#getLinearCandidates(staticPath, linearBuckets).some((route) =>
          route.linearMatcher!.test(staticPath)
        )
      ) {
        shadowedStaticPaths.add(staticPath);
      }
    }

    return (this.#compiled = {
      matcher,
      linearBuckets,
      fallbackRoutes,
      shadowedStaticPaths,
    });
  }

  #getLinearCandidates(
    pathname: string,
    buckets: Map<string, CompiledRoute<T>[]>
  ): CompiledRoute<T>[] {
    const generic = buckets.get('');
    const firstSegment = getFirstSegment(pathname);
    if (!firstSegment) return generic ?? [];

    const specific = buckets.get(firstSegment);
    if (!generic) return specific ?? [];
    if (!specific) return generic;
    return [...generic, ...specific].sort(compareCompiledRoutes);
  }

  #matchStaticRoutes(
    method: string,
    routes: readonly CompiledRoute<T>[]
  ): Result<T> {
    const results: Result<T> = [];
    for (const route of routes) {
      if (route.method === method || route.method === 'ALL') {
        results.push([route.handler, EMPTY_PARAMS, route.pathname]);
      }
    }
    return results;
  }

  #matchCompiled(
    method: string,
    pathname: string,
    compiled: CompiledPlan<T>,
    staticRoutes?: readonly CompiledRoute<T>[]
  ): Result<T> {
    if (
      !staticRoutes &&
      compiled.linearBuckets &&
      compiled.fallbackRoutes.length === 0
    ) {
      return this.#matchLinearRoutes(method, pathname, compiled.linearBuckets);
    }

    const pathSegments = RouterUtils.splitPath(pathname);
    const candidates = staticRoutes ? [...staticRoutes] : [];
    if (compiled.matcher) {
      candidates.push(...compiled.matcher.match(pathSegments));
    }
    if (compiled.linearBuckets) {
      for (const route of this.#getLinearCandidates(
        pathname,
        compiled.linearBuckets
      )) {
        if (
          (route.method === method || route.method === 'ALL') &&
          route.linearMatcher!.test(pathname)
        ) {
          candidates.push(route);
        }
      }
    }
    if (staticRoutes && pathSegments.length > 0) {
      candidates.push(...compiled.fallbackRoutes);
    }
    if (candidates.length > 1) candidates.sort(compareCompiledRoutes);

    const results: Result<T> = [];
    for (const route of candidates) {
      if (route.method !== method && route.method !== 'ALL') continue;
      if (
        staticRoutes &&
        route.params.some(
          (binding) => binding.wildcard && binding.index === pathSegments.length
        )
      ) {
        continue;
      }
      results.push([
        route.handler,
        route.tokens[0] === WILDCARD_SEGMENT
          ? materializeFallbackParams(pathSegments)
          : materializeParams(route, pathSegments),
        route.pathname,
      ]);
    }

    if (!staticRoutes && results.length === 0 && pathSegments.length > 0) {
      for (const route of compiled.fallbackRoutes) {
        if (route.method === method || route.method === 'ALL') {
          results.push([
            route.handler,
            materializeFallbackParams(pathSegments),
            route.pathname,
          ]);
        }
      }
    }
    return results;
  }

  #matchLinearRoutes(
    method: string,
    pathname: string,
    buckets: Map<string, CompiledRoute<T>[]>
  ): Result<T> {
    const candidates = this.#getLinearCandidates(pathname, buckets);
    const results: Result<T> = [];
    for (const route of candidates) {
      if (route.method !== method && route.method !== 'ALL') continue;
      const match = route.linearMatcher!.exec(pathname);
      if (match) {
        results.push([
          route.handler,
          materializeLinearParams(route, match),
          route.pathname,
        ]);
      }
    }
    return results;
  }

  #validateRadixTreePathname(pathname: string): void {
    const unsupportedPatterns = [
      /\{[^}]*\}/g,
      /\\d\+/g,
      /\\w\+/g,
      /\[[^\]]*\]/g,
      /\([^)]*\)/g,
      /\?/g,
    ];

    for (const pattern of unsupportedPatterns) {
      if (pattern.test(pathname)) {
        throw new Error(
          `Unsupported pattern in pathname: ${pathname}. ` +
            'RadixTreeRouter only supports basic parameter patterns (:param) and wildcards (*) at the end.'
        );
      }
    }

    const segments = RouterUtils.splitPath(pathname);
    for (let index = 0; index < segments.length - 1; index++) {
      if (segments[index] === '*') {
        throw new Error(
          `Wildcard (*) is only allowed at the end of the path: ${pathname}`
        );
      }
    }
  }
}
