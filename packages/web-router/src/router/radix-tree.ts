/**
 * @fileoverview Radix Tree Router Implementation
 * High-performance routing using Radix Tree algorithm
 * Inspired by find-my-way: https://github.com/delvedor/find-my-way
 */

import type { Router, Result, Params } from './base';
import { RouterUtils, CommonRouteValidation, decodePathParam } from './base';

interface RadixNode<T> {
  label: string;
  prefix: string;
  children: Map<string, RadixNode<T>>;
  handlers: Map<string, T>;
  wildcardChild?: RadixNode<T>;
  paramChild?: RadixNode<T>;
  paramName?: string;
  isLeaf: boolean;
}

interface StaticRoute<T> {
  method: string;
  handler: T;
}

interface DynamicPath {
  segments: string[];
}

interface CompiledRoute<T> {
  method: string;
  handler: T;
  pathname: string;
  matcher: RegExp;
  paramNames: string[];
  priority: string;
  score: number;
}

const EMPTY_PARAMS = Object.freeze({}) as Params;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compareCompiledRoutes<T>(
  left: CompiledRoute<T>,
  right: CompiledRoute<T>
): number {
  if (left.priority < right.priority) return -1;
  if (left.priority > right.priority) return 1;
  return right.score - left.score;
}

export class RadixTreeRouter<T> implements Router<T> {
  #root: RadixNode<T>;
  #staticRoutes = new Map<string, StaticRoute<T>[]>();
  #staticPaths = new Set<string>();
  #dynamicPaths: DynamicPath[] = [];
  #shadowedStaticPaths = new Set<string>();
  #dynamicBuckets = new Map<string, CompiledRoute<T>[]>();

  constructor() {
    this.#root = this.#createNode('', '');
  }

  add(method: string, pathname: string, handler: T): void {
    // Apply common validation
    RouterUtils.validateBasicPathname(pathname);
    CommonRouteValidation.checkDuplicateParameters(pathname);
    CommonRouteValidation.validateParameterNames(pathname);

    // Apply RadixTree-specific validation
    this.#validateRadixTreePathname(pathname);

    const normalizedPath = RouterUtils.normalizePath(pathname);
    this.#addRoute(method, normalizedPath, handler);
  }

  match(method: string, pathname: string): Result<T> {
    const normalizedPath = RouterUtils.normalizePath(pathname);
    return this.#findRoute(method, normalizedPath);
  }

  /**
   * Validate pathname for RadixTree-specific restrictions
   */
  #validateRadixTreePathname(pathname: string): void {
    // Check for unsupported URLPattern features
    const unsupportedPatterns = [
      /{[^}]*}/g, // URLPattern groups like {version}
      /\\d\+/g, // Regex patterns like \d+
      /\\w\+/g, // Regex patterns like \w+
      /\[[^\]]*\]/g, // Character classes
      /\([^)]*\)/g, // Grouping parentheses
      /\?/g, // Optional segments
    ];

    for (const pattern of unsupportedPatterns) {
      if (pattern.test(pathname)) {
        throw new Error(
          `Unsupported pattern in pathname: ${pathname}. ` +
            'RadixTreeRouter only supports basic parameter patterns (:param) and wildcards (*) at the end.'
        );
      }
    }

    // Check for wildcard in middle of path
    const segments = RouterUtils.splitPath(pathname);
    for (let i = 0; i < segments.length - 1; i++) {
      if (segments[i] === '*') {
        throw new Error(
          `Wildcard (*) is only allowed at the end of the path: ${pathname}`
        );
      }
    }
  }

  #createNode(label: string, prefix: string): RadixNode<T> {
    return {
      label,
      prefix,
      children: new Map(),
      handlers: new Map(),
      isLeaf: false,
    };
  }

  #addRoute(method: string, pathname: string, handler: T): void {
    const segments = RouterUtils.splitPath(pathname);
    let currentNode = this.#root;
    let currentPath = '';

    // Handle empty path or root path
    if (segments.length === 0) {
      currentNode.isLeaf = true;
      currentNode.handlers.set(method, handler);
      this.#registerStaticRoute('/', method, handler);
      return;
    }

    const isStatic = segments.every(
      (segment) => !segment.startsWith(':') && segment !== '*'
    );
    if (isStatic) {
      this.#registerStaticRoute(pathname, method, handler);
    } else {
      const dynamicPath = { segments };
      this.#dynamicPaths.push(dynamicPath);
      this.#registerDynamicRoute(method, pathname, handler, segments);
      for (const staticPath of this.#staticPaths) {
        if (this.#dynamicPathMatches(dynamicPath.segments, staticPath)) {
          this.#shadowedStaticPaths.add(staticPath);
        }
      }
    }

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isLastSegment = i === segments.length - 1;
      const isParam = segment.startsWith(':');
      const isWildcard = segment === '*';

      if (isParam) {
        // Handle parameter segment
        const paramName = segment.slice(1);
        if (!currentNode.paramChild) {
          currentNode.paramChild = this.#createNode(
            segment,
            currentPath + '/' + segment
          );
          currentNode.paramChild.paramName = paramName;
        }
        currentNode = currentNode.paramChild;
        currentPath += '/' + segment;
      } else if (isWildcard) {
        // Handle wildcard segment (only at the end)
        if (!currentNode.wildcardChild) {
          currentNode.wildcardChild = this.#createNode(
            segment,
            currentPath + '/' + segment
          );
        }
        currentNode = currentNode.wildcardChild;
        currentPath += '/' + segment;
      } else {
        // Handle static segment
        if (!currentNode.children.has(segment)) {
          currentNode.children.set(
            segment,
            this.#createNode(segment, currentPath + '/' + segment)
          );
        }
        currentNode = currentNode.children.get(segment)!;
        currentPath += '/' + segment;
      }

      if (isLastSegment) {
        currentNode.isLeaf = true;
        currentNode.handlers.set(method, handler);
      }
    }
  }

  #registerStaticRoute(pathname: string, method: string, handler: T): void {
    const routes = this.#staticRoutes.get(pathname);
    if (routes) {
      routes.push({ method, handler });
    } else {
      this.#staticRoutes.set(pathname, [{ method, handler }]);
    }
    this.#staticPaths.add(pathname);
    for (const dynamicPath of this.#dynamicPaths) {
      if (this.#dynamicPathMatches(dynamicPath.segments, pathname)) {
        this.#shadowedStaticPaths.add(pathname);
        break;
      }
    }
  }

  #registerDynamicRoute(
    method: string,
    pathname: string,
    handler: T,
    segments: string[]
  ): void {
    let pattern = '^';
    const paramNames: string[] = [];
    const priority: string[] = [];
    let score = 0;

    for (const segment of segments) {
      if (segment === '*') {
        pattern += '(?:/(.*))?$';
        paramNames.push('*');
        priority.push('2');
        score -= 100;
        break;
      }

      pattern += '/';
      if (segment.startsWith(':')) {
        pattern += '([^/]+)';
        paramNames.push(segment.slice(1));
        priority.push('1');
        score += 1;
      } else {
        pattern += escapeRegExp(segment);
        priority.push('0');
        score += 2;
      }
    }

    if (!pattern.endsWith('$')) pattern += '$';
    const firstSegment = segments[0];
    const bucketKey =
      firstSegment.startsWith(':') || firstSegment === '' ? '' : firstSegment;
    const route: CompiledRoute<T> = {
      method,
      handler,
      pathname,
      matcher: new RegExp(pattern),
      paramNames,
      priority: priority.join(''),
      score: score + segments.length,
    };
    const bucket = this.#dynamicBuckets.get(bucketKey);
    if (!bucket) {
      this.#dynamicBuckets.set(bucketKey, [route]);
      return;
    }

    let index = bucket.length;
    while (index > 0 && compareCompiledRoutes(bucket[index - 1], route) > 0) {
      index--;
    }
    bucket.splice(index, 0, route);
  }

  #matchDynamicRoutes(method: string, pathname: string): Result<T> | undefined {
    const firstSlash = pathname.indexOf('/', 1);
    const firstSegment =
      firstSlash === -1 ? pathname.slice(1) : pathname.slice(1, firstSlash);
    const specific = firstSegment
      ? this.#dynamicBuckets.get(firstSegment)
      : undefined;
    const generic = this.#dynamicBuckets.get('');
    if (!specific && !generic) return undefined;

    const candidates =
      specific && generic
        ? [...specific, ...generic].sort(compareCompiledRoutes)
        : (specific ?? generic!);
    const results: Result<T> = [];
    for (const route of candidates) {
      if (route.method !== method && route.method !== 'ALL') continue;
      const match = route.matcher.exec(pathname);
      if (!match) continue;

      let params: Params | undefined;
      for (let index = 0; index < route.paramNames.length; index++) {
        const value = match[index + 1];
        if (value) {
          (params ??= Object.create(null))[route.paramNames[index]] =
            decodePathParam(value);
        }
      }
      results.push([route.handler, params ?? EMPTY_PARAMS, route.pathname]);
    }
    return results;
  }

  #dynamicPathMatches(segments: string[], pathname: string): boolean {
    const staticSegments = RouterUtils.splitPath(pathname);
    for (let index = 0; index < segments.length; index++) {
      const segment = segments[index];
      if (segment === '*') return true;
      if (index >= staticSegments.length) return false;
      if (!segment.startsWith(':') && segment !== staticSegments[index]) {
        return false;
      }
    }
    return segments.length === staticSegments.length;
  }

  #findRoute(method: string, pathname: string): Result<T> {
    const staticRoutes = this.#staticRoutes.get(pathname);
    if (staticRoutes && !this.#shadowedStaticPaths.has(pathname)) {
      const results: Result<T> = [];
      for (const route of staticRoutes) {
        if (route.method === method || route.method === 'ALL') {
          results.push([route.handler, EMPTY_PARAMS, pathname]);
        }
      }
      return results;
    }

    if (!this.#staticRoutes.has(pathname)) {
      const dynamicResults = this.#matchDynamicRoutes(method, pathname);
      if (dynamicResults?.length) return dynamicResults;
    }

    const segments = RouterUtils.splitPath(pathname);
    const results: Result<T> = [];

    // Handle empty path or root path
    if (segments.length === 0) {
      if (this.#root.isLeaf) {
        const handler =
          this.#root.handlers.get(method) || this.#root.handlers.get('ALL');
        if (handler) {
          results.push([handler, EMPTY_PARAMS, '/']);
        }
      }
      return results;
    }

    this.#findRouteRecursive(this.#root, segments, 0, {}, method, results, 0);
    return results;
  }

  #findRouteRecursive(
    node: RadixNode<T>,
    segments: string[],
    segmentIndex: number,
    params: Params,
    method: string,
    results: Result<T>,
    paramCount: number
  ): void {
    if (segmentIndex >= segments.length) {
      // We've reached the end of the path
      if (node.isLeaf) {
        const handler = node.handlers.get(method) || node.handlers.get('ALL');
        if (handler) {
          results.push([
            handler,
            paramCount === 0 ? EMPTY_PARAMS : { ...params },
            node.prefix,
          ]);
        }
      }
      return;
    }

    const currentSegment = segments[segmentIndex];
    const isLastSegment = segmentIndex === segments.length - 1;

    // Try static match first (higher priority)
    const staticChild = node.children.get(currentSegment);
    if (staticChild) {
      this.#findRouteRecursive(
        staticChild,
        segments,
        segmentIndex + 1,
        params,
        method,
        results,
        paramCount
      );
      // If we found a static match, don't try parameter match
      // if (results.length > 0) {
      //   return;
      // }
    }

    // Try parameter match (lower priority)
    if (node.paramChild) {
      const paramName = node.paramChild.paramName!;
      params[paramName] = decodePathParam(currentSegment);
      this.#findRouteRecursive(
        node.paramChild,
        segments,
        segmentIndex + 1,
        params,
        method,
        results,
        paramCount + 1
      );
      delete params[paramName]; // Backtrack
    }

    // Try wildcard match (only for last segment or if wildcard is at the end)
    if (node.wildcardChild && (isLastSegment || node.wildcardChild.isLeaf)) {
      const remainingPath = segments.slice(segmentIndex).join('/');
      if (remainingPath) {
        params['*'] = remainingPath;
      }
      this.#findRouteRecursive(
        node.wildcardChild,
        segments,
        segments.length,
        params,
        method,
        results,
        remainingPath ? paramCount + 1 : paramCount
      );
      if (remainingPath) {
        delete params['*']; // Backtrack
      }
    }
  }
}
