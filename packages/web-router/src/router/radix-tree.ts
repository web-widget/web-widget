/**
 * @fileoverview Radix Tree Router Implementation
 * High-performance routing using Radix Tree algorithm
 * Inspired by find-my-way: https://github.com/delvedor/find-my-way
 */

import type { Router, Result, Params } from './base';
import { RouterUtils, CommonRouteValidation } from './base';

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

interface RouteInfo<T> {
  handler: T;
  params: Params;
  pathname: string;
}

export class RadixTreeRouter<T> implements Router<T> {
  #root: RadixNode<T>;

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
    const results = this.#findRoute(method, normalizedPath);
    // Convert RouteInfo[] to the expected format [T, Params, string][]
    const handlers: [T, Params, string][] = results.map((result) => [
      result.handler,
      result.params,
      result.pathname,
    ]);
    return handlers;
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
      return;
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

  #findRoute(method: string, pathname: string): RouteInfo<T>[] {
    const segments = RouterUtils.splitPath(pathname);
    const params: Params = {};
    const results: RouteInfo<T>[] = [];

    // Handle empty path or root path
    if (segments.length === 0) {
      if (this.#root.isLeaf) {
        const handler =
          this.#root.handlers.get(method) || this.#root.handlers.get('ALL');
        if (handler) {
          results.push({
            handler,
            params: {},
            pathname: '/',
          });
        }
      }
      return results;
    }

    this.#findRouteRecursive(this.#root, segments, 0, params, method, results);
    return results;
  }

  #findRouteRecursive(
    node: RadixNode<T>,
    segments: string[],
    segmentIndex: number,
    params: Params,
    method: string,
    results: RouteInfo<T>[]
  ): void {
    if (segmentIndex >= segments.length) {
      // We've reached the end of the path
      if (node.isLeaf) {
        const handler = node.handlers.get(method) || node.handlers.get('ALL');
        if (handler) {
          results.push({
            handler,
            params: { ...params },
            pathname: node.prefix,
          });
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
        results
      );
      // If we found a static match, don't try parameter match
      // if (results.length > 0) {
      //   return;
      // }
    }

    // Try parameter match (lower priority)
    if (node.paramChild) {
      const paramName = node.paramChild.paramName!;
      params[paramName] = decodeURIComponent(currentSegment);
      this.#findRouteRecursive(
        node.paramChild,
        segments,
        segmentIndex + 1,
        params,
        method,
        results
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
        results
      );
      if (remainingPath) {
        delete params['*']; // Backtrack
      }
    }
  }
}
