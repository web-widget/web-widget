/**
 * @fileoverview Router domain object - URL pattern matching and route registration
 */
export const METHOD_NAME_ALL = 'ALL' as const;
export const METHODS = [
  'get',
  'post',
  'put',
  'delete',
  'options',
  'patch',
] as const;

export interface Router<T> {
  add(method: string, pathname: string, handler: T): void;
  match(method: string, pathname: string): Result<T>;
}

export type Params = Record<string, string>;
export type Pathname = string;
/**
 * Type representing the result of a route match.
 *
 * The result can be in one of two formats:
 * 1. An array of handlers with their corresponding parameter index maps, followed by a parameter stash.
 * 2. An array of handlers with their corresponding parameter maps.
 *
 * Example:
 *
 * [[handler, paramIndexMap][], paramArray]
 * ```typescript
 * [
 *   [
 *     [middlewareA, {}],                     // '*'
 *     [funcA,       {'id': 0}],              // '/user/:id/*'
 *     [funcB,       {'id': 0, 'action': 1}], // '/user/:id/:action'
 *   ],
 *   ['123', 'abc']
 * ]
 * ```
 *
 * [[handler, params][]]
 * ```typescript
 * [
 *   [
 *     [middlewareA, {}],                             // '*'
 *     [funcA,       {'id': '123'}],                  // '/user/:id/*'
 *     [funcB,       {'id': '123', 'action': 'abc'}], // '/user/:id/:action'
 *   ]
 * ]
 * ```
 */
export type Result<T> = [[T, Params, Pathname][]];

export class UnsupportedPathError extends Error {}

type Route<T> = [URLPattern, string, T]; // [pattern, method, handler, pathname]

export class URLPatternRouter<T> implements Router<T> {
  #routes: Route<T>[] = [];

  add(method: string, pathname: string, handler: T) {
    let pattern;
    try {
      pattern = new URLPattern({ pathname });
    } catch (error) {
      throw new UnsupportedPathError((error as Error).message, {
        cause: error,
      });
    }
    this.#routes.push([pattern, method, handler]);
  }

  match(method: string, pathname: string): Result<T> {
    const handlers: [T, Params, string][] = [];

    for (const [pattern, routeMethod, handler] of this.#routes) {
      if (routeMethod === METHOD_NAME_ALL || routeMethod === method) {
        const match = pattern.exec({ pathname });
        if (match) {
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
          handlers.push([handler, params, pattern.pathname]);
        }
      }
    }

    return [handlers];
  }
}
