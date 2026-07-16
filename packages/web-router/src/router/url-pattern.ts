/**
 * @fileoverview URLPattern Router Implementation
 * Router implementation using Web standard URLPattern API
 */

import type { Router, Result, Params } from './base';
import { decodePathParam, METHOD_NAME_ALL, UnsupportedPathError } from './base';

interface SegmentMatcher {
  segments: string[];
  paramNames: (string | undefined)[];
  paramIndexes?: number[];
  matcher?: RegExp;
  trailingSlash: boolean;
}

type OptimizedRoute<T> = [
  URLPattern,
  string,
  T,
  string | undefined,
  SegmentMatcher | undefined,
  number,
];

const EMPTY_PARAMS = Object.freeze(Object.create(null)) as Params;
const STATIC_PATH = /^\/[\w.~!$&'+,;=@/-]*$/;

function requiresPathNormalization(pathname: string): boolean {
  if (!pathname.includes('.') && !pathname.includes('%')) return false;
  return /(?:^|\/)(?:\.|%2e){1,2}(?:\/|$)/i.test(pathname);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createSegmentMatcher(pathname: string): SegmentMatcher | undefined {
  if (pathname === '/' || !pathname.startsWith('/')) return undefined;

  const segments = pathname.slice(1).split('/');
  const paramNames: (string | undefined)[] = [];
  const paramIndexes: number[] = [];
  const patternSegments: string[] = [];
  let captureIndex = 0;
  for (const segment of segments) {
    if (segment.startsWith(':')) {
      const name = segment.slice(1);
      if (!/^[a-z_$][\w$]*$/i.test(name)) return undefined;
      paramNames.push(name);
      paramIndexes.push(++captureIndex);
      patternSegments.push('([^/]+)');
    } else {
      if (!/^[\w.~!$&'+,;=@-]*$/.test(segment)) return undefined;
      paramNames.push(undefined);
      paramIndexes.push(0);
      patternSegments.push(escapeRegExp(segment));
    }
  }

  return {
    segments,
    paramNames,
    paramIndexes,
    matcher: pathname.endsWith('/')
      ? undefined
      : new RegExp(`^/${patternSegments.join('/')}$`),
    trailingSlash: pathname.endsWith('/'),
  };
}

export class URLPatternRouter<T> implements Router<T> {
  #routes: OptimizedRoute<T>[] = [];
  #staticRoutes = new Map<string, OptimizedRoute<T>[]>();
  #staticPaths = new Set<string>();
  #shadowedStaticPaths = new Set<string>();
  #dynamicPatterns: URLPattern[] = [];
  #dynamicBuckets = new Map<string, OptimizedRoute<T>[]>();

  add(method: string, pathname: string, handler: T) {
    let pattern;
    try {
      pattern = new URLPattern({ pathname });
    } catch (error) {
      throw new UnsupportedPathError((error as Error).message, {
        cause: error,
      });
    }
    const canonicalPathname = pattern.pathname;
    const staticPath = STATIC_PATH.test(canonicalPathname)
      ? canonicalPathname
      : undefined;
    const segmentMatcher = staticPath
      ? undefined
      : createSegmentMatcher(canonicalPathname);
    const route: OptimizedRoute<T> = [
      pattern,
      method,
      handler,
      staticPath,
      segmentMatcher,
      this.#routes.length,
    ];
    this.#routes.push(route);
    if (staticPath !== undefined) {
      const routes = this.#staticRoutes.get(staticPath);
      if (routes) routes.push(route);
      else this.#staticRoutes.set(staticPath, [route]);
      this.#staticPaths.add(staticPath);
      for (const dynamicPattern of this.#dynamicPatterns) {
        if (dynamicPattern.exec({ pathname: staticPath })) {
          this.#shadowedStaticPaths.add(staticPath);
          break;
        }
      }
    } else {
      this.#dynamicPatterns.push(pattern);
      const bucketKey =
        segmentMatcher && segmentMatcher.paramNames[0] === undefined
          ? segmentMatcher.segments[0]
          : '';
      const routes = this.#dynamicBuckets.get(bucketKey);
      if (routes) routes.push(route);
      else this.#dynamicBuckets.set(bucketKey, [route]);
      for (const staticPath of this.#staticPaths) {
        if (pattern.exec({ pathname: staticPath })) {
          this.#shadowedStaticPaths.add(staticPath);
        }
      }
    }
  }

  match(method: string, pathname: string): Result<T> {
    const handlers: [T, Params, string][] = [];

    let pathSegments: string[] | undefined;
    const canUseFastPath =
      pathname.startsWith('/') && !requiresPathNormalization(pathname);

    if (canUseFastPath && !this.#shadowedStaticPaths.has(pathname)) {
      const staticRoutes = this.#staticRoutes.get(pathname);
      if (staticRoutes) {
        const staticHandlers: [T, Params, string][] = [];
        for (const [pattern, routeMethod, handler] of staticRoutes) {
          if (routeMethod === METHOD_NAME_ALL || routeMethod === method) {
            staticHandlers.push([handler, EMPTY_PARAMS, pattern.pathname]);
          }
        }
        return staticHandlers;
      }
    }

    let candidateRoutes = this.#routes;
    if (canUseFastPath && !this.#staticRoutes.has(pathname)) {
      const firstSlash = pathname.indexOf('/', 1);
      const firstSegment =
        firstSlash === -1 ? pathname.slice(1) : pathname.slice(1, firstSlash);
      const specific = firstSegment
        ? this.#dynamicBuckets.get(firstSegment)
        : undefined;
      const generic = this.#dynamicBuckets.get('');
      candidateRoutes =
        specific && generic
          ? [...specific, ...generic].sort((a, b) => a[5] - b[5])
          : (specific ?? generic ?? []);
    }

    for (const [
      pattern,
      routeMethod,
      handler,
      staticPath,
      segmentMatcher,
    ] of candidateRoutes) {
      if (routeMethod === METHOD_NAME_ALL || routeMethod === method) {
        if (staticPath !== undefined && canUseFastPath) {
          if (staticPath === pathname) {
            handlers.push([handler, EMPTY_PARAMS, pattern.pathname]);
          }
          continue;
        }

        if (segmentMatcher && canUseFastPath) {
          if (segmentMatcher.trailingSlash !== pathname.endsWith('/')) {
            continue;
          }

          if (segmentMatcher.matcher) {
            const match = segmentMatcher.matcher.exec(pathname);
            if (!match) continue;

            let params: Params | undefined;
            for (
              let index = 0;
              index < segmentMatcher.paramNames.length;
              index++
            ) {
              const paramName = segmentMatcher.paramNames[index];
              if (paramName) {
                const value = match[segmentMatcher.paramIndexes![index]];
                (params ??= Object.create(null))[paramName] =
                  decodePathParam(value);
              }
            }
            if (params) Object.freeze(params);
            handlers.push([handler, params ?? EMPTY_PARAMS, pattern.pathname]);
            continue;
          }

          pathSegments ??= pathname.slice(1).split('/');
          if (pathSegments.length !== segmentMatcher.segments.length) {
            continue;
          }

          let matched = true;
          for (let index = 0; index < pathSegments.length; index++) {
            const paramName = segmentMatcher.paramNames[index];
            if (
              (paramName && pathSegments[index] === '') ||
              (!paramName &&
                segmentMatcher.segments[index] !== pathSegments[index])
            ) {
              matched = false;
              break;
            }
          }

          if (matched) {
            let params: Params | undefined;
            for (let index = 0; index < pathSegments.length; index++) {
              const paramName = segmentMatcher.paramNames[index];
              if (paramName) {
                (params ??= Object.create(null))[paramName] = decodePathParam(
                  pathSegments[index]
                );
              }
            }
            if (params) Object.freeze(params);
            handlers.push([handler, params ?? EMPTY_PARAMS, pattern.pathname]);
          }
          continue;
        }

        const match = pattern.exec({ pathname });
        if (match) {
          const params = Object.create(null) as Params;
          for (const key in match.pathname.groups) {
            const value = match.pathname.groups[key];

            // In Cloudflare Workers, optional parameters return empty string instead of undefined
            // We need to normalize this to undefined for consistency with Web standards
            if (value !== undefined && value !== '') {
              params[key] = decodePathParam(value);
            }
          }
          Object.freeze(params);
          handlers.push([handler, params, pattern.pathname]);
        }
      }
    }

    return handlers;
  }
}
