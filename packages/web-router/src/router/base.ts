/**
 * @fileoverview Router Base Types and Interfaces
 */

export const METHOD_NAME_ALL = 'ALL' as const;
export const METHODS = [
  'get',
  'post',
  'put',
  'delete',
  'options',
  'patch',
  'head',
] as const;

export type RouterType = 'url-pattern' | 'radix-tree';

export interface Router<T> {
  add(method: string, pathname: string, handler: T): void;
  match(method: string, pathname: string): Result<T>;
}

export type Params = Record<string, string>;

/**
 * Router result type
 *
 * @example
 * ```typescript
 * const result: Result<Handler> = [
 *   [handler, { id: '123' }, '/users/:id'],
 *   [handler2, { id: '123', name: 'john' }, '/users/:id/:name']
 * ];
 * ```
 */
export type Result<T> = [T, Params, string][];

export class UnsupportedPathError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'UnsupportedPathError';
  }
}

/**
 * Common router utilities and validation functions
 */
export class RouterUtils {
  /**
   * Normalize pathname for consistent handling
   */
  static normalizePath(pathname: string): string {
    // Ensure path starts with /
    if (!pathname.startsWith('/')) {
      pathname = '/' + pathname;
    }

    // Remove trailing slash except for root
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    return pathname;
  }

  /**
   * Split pathname into segments
   */
  static splitPath(pathname: string): string[] {
    return pathname.split('/').filter(Boolean);
  }

  /**
   * Validate basic pathname format
   */
  static validateBasicPathname(pathname: string): void {
    if (typeof pathname !== 'string') {
      throw new Error('Pathname must be a string');
    }

    if (pathname.includes('//')) {
      throw new Error('Pathname cannot contain consecutive slashes');
    }
  }

  /**
   * Extract parameters from URLPattern match result
   */
  static extractParamsFromURLPattern(match: URLPatternResult): Params {
    const params = Object.create(null) as Params;
    for (const key in match.pathname.groups) {
      const value = match.pathname.groups[key];

      // In Cloudflare Workers, optional parameters return empty string instead of undefined
      // We need to normalize this to undefined for consistency with Web standards
      if (value !== undefined && value !== '') {
        params[key] = decodeURIComponent(value);
      }
    }
    Object.freeze(params);
    return params;
  }
}

/**
 * Common route validation rules that apply to all router types
 */
export class CommonRouteValidation {
  /**
   * Check for duplicate parameter names
   */
  static checkDuplicateParameters(pathname: string): void {
    const segments = RouterUtils.splitPath(pathname);
    const paramNames = new Set<string>();

    for (const segment of segments) {
      if (segment.startsWith(':')) {
        const paramName = segment.slice(1);
        if (paramNames.has(paramName)) {
          throw new Error(
            `Duplicate parameter name '${paramName}' in pathname: ${pathname}`
          );
        }
        paramNames.add(paramName);
      }
    }
  }

  /**
   * Validate parameter names are valid
   */
  static validateParameterNames(pathname: string): void {
    const segments = RouterUtils.splitPath(pathname);

    for (const segment of segments) {
      if (segment.startsWith(':')) {
        const paramName = segment.slice(1);
        if (!paramName || paramName.includes('/')) {
          throw new Error(
            `Invalid parameter name '${paramName}' in pathname: ${pathname}`
          );
        }
      }
    }
  }
}
