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
export type Scope = URLPattern;
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
export type Result<T> = [[T, Params, URLPattern][]];

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
    const handlers: [T, Params, URLPattern][] = [];

    for (const [pattern, routeMethod, handler] of this.#routes) {
      if (routeMethod === METHOD_NAME_ALL || routeMethod === method) {
        const matched = pattern.exec({ pathname });
        if (matched) {
          const params = Object.create(null) as Params;
          for (const key in matched.pathname.groups) {
            const value = matched.pathname.groups[key];

            if (value !== undefined) {
              params[key] = decodeURIComponent(value);
            }
          }
          Object.freeze(params);
          handlers.push([handler, params, pattern]);
        }
      }
    }

    return [handlers];
  }
}
