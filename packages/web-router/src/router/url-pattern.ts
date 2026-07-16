/**
 * @fileoverview URLPattern Router Implementation
 * Router implementation using Web standard URLPattern API
 */

import type { Router, Result, Params } from './base';
import { decodePathParam, METHOD_NAME_ALL, UnsupportedPathError } from './base';
import {
  compileLinearMatcher,
  CompiledPathMatcher,
  getPathTokenBucketKey,
  LINEAR_BUCKET_LIMIT,
  PARAM_SEGMENT,
  scanPathname,
  WILDCARD_SEGMENT,
  type PathSegment,
  type PathToken,
} from './compiled-path';

interface SimplePath {
  tokens: readonly PathToken[];
  paramIndexes: readonly number[];
  paramNames: readonly string[];
}

interface OptimizedRoute<T> {
  routeId: number;
  method: string;
  handler: T;
  pattern: URLPattern;
  patternPathname: string;
  staticPath?: string;
  tokens: readonly PathToken[];
  paramIndexes: readonly number[];
  paramNames: readonly string[];
  complexPrefix: readonly string[];
  linearMatcher?: RegExp;
}

interface CompiledPlan<T> {
  staticRoutes: Map<string, OptimizedRoute<T>[]>;
  linearBuckets: Map<string, OptimizedRoute<T>[]>;
  trieMatcher?: CompiledPathMatcher<OptimizedRoute<T>>;
  fallbackMatcher?: CompiledPathMatcher<FallbackRoute<T>>;
  hasDynamicRoutes: boolean;
  hasFallbackRoutes: boolean;
}

interface FallbackRoute<T> {
  route: OptimizedRoute<T>;
  tokens: readonly PathToken[];
}

type ParamEntry = readonly [string, string];

interface Candidate<T> {
  route: OptimizedRoute<T>;
  segments?: readonly PathSegment[];
  linearMatch?: RegExpExecArray;
  patternMatch?: URLPatternResult;
}

interface CachedMatch {
  routeId: number;
  params: readonly ParamEntry[];
  freshEmptyParams: boolean;
}

const EMPTY_PARAMS = Object.freeze(Object.create(null)) as Params;
const EMPTY_ENTRIES: readonly ParamEntry[] = Object.freeze([]);
const STATIC_PATH = /^\/[\w.~!$&'+,;=@/-]*$/;
const STATIC_SEGMENT = /^[\w.~!$&'+,;=@-]*$/;
const PARAM_NAME = /^[a-z_$][\w$]*$/i;
const MATCH_PLAN_CACHE_LIMIT = 128;

function requiresPathNormalization(pathname: string): boolean {
  if (!pathname.includes('.') && !pathname.includes('%')) return false;
  return /(?:^|\/)(?:\.|%2e){1,2}(?:\/|$)/i.test(pathname);
}

function splitPathname(pathname: string): string[] {
  return pathname === '/' ? [] : pathname.slice(1).split('/');
}

function getFirstSegment(pathname: string): string {
  const firstSlash = pathname.indexOf('/', 1);
  return firstSlash === -1 ? pathname.slice(1) : pathname.slice(1, firstSlash);
}

function createSimplePath(pathname: string): SimplePath | undefined {
  if (!pathname.startsWith('/')) return undefined;

  const segments = splitPathname(pathname);
  const tokens: PathToken[] = [];
  const paramIndexes: number[] = [];
  const paramNames: string[] = [];
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    if (segment.startsWith(':')) {
      const name = segment.slice(1);
      if (!PARAM_NAME.test(name)) return undefined;
      tokens.push(PARAM_SEGMENT);
      paramIndexes.push(index);
      paramNames.push(name);
      continue;
    }

    if (!STATIC_SEGMENT.test(segment)) return undefined;
    tokens.push(segment);
  }

  return { tokens, paramIndexes, paramNames };
}

/** Return only the literal prefix that can be used as a conservative bucket. */
function createComplexPrefix(pathname: string): string[] {
  const prefix: string[] = [];
  if (!pathname.startsWith('/')) return prefix;

  for (const segment of splitPathname(pathname)) {
    if (!segment || !STATIC_SEGMENT.test(segment)) break;
    prefix.push(segment);
  }
  return prefix;
}

function extractParamEntries(match: URLPatternResult): ParamEntry[] {
  const entries: ParamEntry[] = [];
  for (const key in match.pathname.groups) {
    const value = match.pathname.groups[key];
    if (value !== undefined && value !== '') {
      entries.push([key, decodePathParam(value)]);
    }
  }
  return entries;
}

function simpleParamEntries<T>(
  route: OptimizedRoute<T>,
  pathname: string,
  segments: readonly PathSegment[]
): ParamEntry[] {
  if (route.paramNames.length === 0) return [];

  const entries: ParamEntry[] = [];
  for (let index = 0; index < route.paramNames.length; index++) {
    const segment = segments[route.paramIndexes[index]];
    entries.push([
      route.paramNames[index],
      decodePathParam(pathname.slice(segment.start, segment.end)),
    ]);
  }
  return entries;
}

function linearParamEntries<T>(
  route: OptimizedRoute<T>,
  match: RegExpExecArray
): ParamEntry[] {
  if (route.paramNames.length === 0) return [];

  const entries: ParamEntry[] = [];
  for (let index = 0; index < route.paramNames.length; index++) {
    entries.push([route.paramNames[index], decodePathParam(match[index + 1])]);
  }
  return entries;
}

function createParams(
  entries: readonly ParamEntry[],
  freshEmptyParams: boolean
): Params {
  if (entries.length === 0 && !freshEmptyParams) return EMPTY_PARAMS;

  const params = Object.create(null) as Params;
  for (const [name, value] of entries) params[name] = value;
  Object.freeze(params);
  return params;
}

function materializeResult<T>(
  routes: readonly OptimizedRoute<T>[],
  matches: readonly CachedMatch[]
): Result<T> {
  const results: Result<T> = [];
  for (const match of matches) {
    const route = routes[match.routeId];
    results.push([
      route.handler,
      createParams(match.params, match.freshEmptyParams),
      route.patternPathname,
    ]);
  }
  return results;
}

export class URLPatternRouter<T> implements Router<T> {
  #routes: OptimizedRoute<T>[] = [];
  #staticRoutes = new Map<string, OptimizedRoute<T>[]>();
  #hasNonStaticRoutes = false;
  #compiled = new Map<string, CompiledPlan<T>>();
  #matchPlanCache = new Map<string, readonly CachedMatch[]>();

  add(method: string, pathname: string, handler: T): void {
    let pattern: URLPattern;
    try {
      pattern = new URLPattern({ pathname });
    } catch (error) {
      throw new UnsupportedPathError((error as Error).message, {
        cause: error,
      });
    }

    const patternPathname = pattern.pathname;
    const simplePath = createSimplePath(patternPathname);
    const route: OptimizedRoute<T> = {
      routeId: this.#routes.length,
      method,
      handler,
      pattern,
      patternPathname,
      staticPath: STATIC_PATH.test(patternPathname)
        ? patternPathname
        : undefined,
      tokens: simplePath?.tokens ?? [],
      paramIndexes: simplePath?.paramIndexes ?? [],
      paramNames: simplePath?.paramNames ?? [],
      complexPrefix: simplePath ? [] : createComplexPrefix(patternPathname),
    };
    this.#routes.push(route);
    if (route.staticPath !== undefined) {
      const routes = this.#staticRoutes.get(route.staticPath);
      if (routes) routes.push(route);
      else this.#staticRoutes.set(route.staticPath, [route]);
    } else {
      this.#hasNonStaticRoutes = true;
    }
    this.#compiled.clear();
    this.#matchPlanCache.clear();
  }

  match(method: string, pathname: string): Result<T> {
    const canUseFastPath =
      pathname.startsWith('/') && !requiresPathNormalization(pathname);
    if (canUseFastPath && !this.#hasNonStaticRoutes) {
      return this.#materializeStaticRoutes(
        this.#staticRoutes.get(pathname),
        method
      );
    }
    const plan = canUseFastPath ? this.#getCompiledPlan(method) : undefined;
    if (plan && !plan.hasDynamicRoutes && !plan.hasFallbackRoutes) {
      return this.#materializeStaticRoutes(
        plan.staticRoutes.get(pathname),
        method
      );
    }

    const cacheKey = `${method}\0${pathname}`;
    const cached = this.#matchPlanCache.get(cacheKey);
    if (cached) {
      this.#matchPlanCache.delete(cacheKey);
      this.#matchPlanCache.set(cacheKey, cached);
      return materializeResult(this.#routes, cached);
    }

    const matches = canUseFastPath
      ? this.#matchFast(method, pathname, plan)
      : this.#matchWithURLPattern(method, pathname);
    this.#storeMatchPlan(cacheKey, matches);
    return materializeResult(this.#routes, matches);
  }

  #getCompiledPlan(method: string): CompiledPlan<T> {
    const existing = this.#compiled.get(method);
    if (existing) return existing;

    const staticRoutes = new Map<string, OptimizedRoute<T>[]>();
    const dynamicBuckets = new Map<string, OptimizedRoute<T>[]>();
    const fallbackRoutes: FallbackRoute<T>[] = [];
    for (const route of this.#routes) {
      if (route.method !== method && route.method !== METHOD_NAME_ALL) {
        continue;
      }

      if (route.staticPath !== undefined) {
        const routes = staticRoutes.get(route.staticPath);
        if (routes) routes.push(route);
        else staticRoutes.set(route.staticPath, [route]);
        continue;
      }

      if (route.paramNames.length > 0 || route.tokens.length > 0) {
        const key = getPathTokenBucketKey(route.tokens);
        const bucket = dynamicBuckets.get(key);
        if (bucket) bucket.push(route);
        else dynamicBuckets.set(key, [route]);
        continue;
      }

      // The prefix trie only selects candidates. URLPattern remains the
      // authority for regex, optional, and wildcard semantics.
      fallbackRoutes.push({
        route,
        tokens: [...route.complexPrefix, WILDCARD_SEGMENT],
      });
    }

    const trieRoutes: OptimizedRoute<T>[] = [];
    const linearBuckets = new Map<string, OptimizedRoute<T>[]>();
    for (const [key, routes] of dynamicBuckets) {
      if (routes.length <= LINEAR_BUCKET_LIMIT) {
        for (const route of routes) {
          route.linearMatcher ??= compileLinearMatcher(route.tokens);
        }
        linearBuckets.set(key, routes);
      } else {
        trieRoutes.push(...routes);
      }
    }

    const plan: CompiledPlan<T> = {
      staticRoutes,
      linearBuckets,
      trieMatcher:
        trieRoutes.length > 0 ? new CompiledPathMatcher(trieRoutes) : undefined,
      fallbackMatcher:
        fallbackRoutes.length > 0
          ? new CompiledPathMatcher(fallbackRoutes)
          : undefined,
      hasDynamicRoutes: dynamicBuckets.size > 0 || trieRoutes.length > 0,
      hasFallbackRoutes: fallbackRoutes.length > 0,
    };
    this.#compiled.set(method, plan);
    return plan;
  }

  #materializeStaticRoutes(
    routes: readonly OptimizedRoute<T>[] | undefined,
    method: string
  ): Result<T> {
    if (!routes) return [];

    const results: Result<T> = [];
    for (const route of routes) {
      if (route.method !== method && route.method !== METHOD_NAME_ALL) {
        continue;
      }
      results.push([route.handler, EMPTY_PARAMS, route.patternPathname]);
    }
    return results;
  }

  #matchFast(
    method: string,
    pathname: string,
    compiledPlan?: CompiledPlan<T>
  ): readonly CachedMatch[] {
    const plan = compiledPlan ?? this.#getCompiledPlan(method);
    const staticRoutes = plan.staticRoutes.get(pathname);
    if (!plan.hasDynamicRoutes && !plan.hasFallbackRoutes) {
      return staticRoutes
        ? staticRoutes.map((route) => ({
            routeId: route.routeId,
            params: EMPTY_ENTRIES,
            freshEmptyParams: false,
          }))
        : [];
    }

    let segments: readonly PathSegment[] | undefined;
    const candidates: Candidate<T>[] = [];
    if (staticRoutes) {
      for (const route of staticRoutes) candidates.push({ route });
    }

    if (plan.trieMatcher) {
      segments ??= scanPathname(pathname);
      for (const match of plan.trieMatcher.matchPath(pathname, segments)) {
        candidates.push({ route: match.route, segments: match.segments });
      }
    }

    this.#collectLinearCandidates(pathname, plan.linearBuckets, (route) => {
      const match = route.linearMatcher!.exec(pathname);
      if (match) candidates.push({ route, linearMatch: match });
    });

    if (plan.hasFallbackRoutes) {
      segments ??= scanPathname(pathname);
      for (const match of plan.fallbackMatcher!.matchPath(pathname, segments)) {
        const route = match.route.route;
        const patternMatch = route.pattern.exec({ pathname });
        if (patternMatch) candidates.push({ route, patternMatch });
      }
    }

    if (candidates.length > 1) {
      candidates.sort(
        (left, right) => left.route.routeId - right.route.routeId
      );
    }
    return this.#cacheCandidates(pathname, candidates);
  }

  #collectLinearCandidates(
    pathname: string,
    buckets: Map<string, OptimizedRoute<T>[]>,
    visit: (route: OptimizedRoute<T>) => void
  ): void {
    const generic = buckets.get('');
    const firstSegment = getFirstSegment(pathname);
    const specific = firstSegment ? buckets.get(firstSegment) : undefined;
    if (generic) for (const route of generic) visit(route);
    if (specific && specific !== generic) {
      for (const route of specific) visit(route);
    }
  }

  #matchWithURLPattern(
    method: string,
    pathname: string
  ): readonly CachedMatch[] {
    const candidates: Candidate<T>[] = [];
    for (const route of this.#routes) {
      if (route.method !== method && route.method !== METHOD_NAME_ALL) {
        continue;
      }
      const match = route.pattern.exec({ pathname });
      if (match) candidates.push({ route, patternMatch: match });
    }
    return this.#cacheCandidates(pathname, candidates);
  }

  #cacheCandidates(
    _pathname: string,
    candidates: readonly Candidate<T>[]
  ): readonly CachedMatch[] {
    const matches: CachedMatch[] = [];
    for (const candidate of candidates) {
      let params: ParamEntry[];
      if (candidate.segments) {
        params = simpleParamEntries(
          candidate.route,
          _pathname,
          candidate.segments
        );
      } else if (candidate.linearMatch) {
        params = linearParamEntries(candidate.route, candidate.linearMatch);
      } else if (candidate.patternMatch) {
        params = extractParamEntries(candidate.patternMatch);
      } else {
        params = [];
      }
      matches.push({
        routeId: candidate.route.routeId,
        params,
        freshEmptyParams: candidate.patternMatch !== undefined,
      });
    }
    return matches;
  }

  #storeMatchPlan(key: string, matches: readonly CachedMatch[]): void {
    this.#matchPlanCache.set(key, matches);
    while (this.#matchPlanCache.size > MATCH_PLAN_CACHE_LIMIT) {
      this.#matchPlanCache.delete(this.#matchPlanCache.keys().next().value!);
    }
  }
}
