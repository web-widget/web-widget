export const METHOD_NAME_ALL = "ALL" as const;
export const METHODS = [
  "get",
  "post",
  "put",
  "delete",
  "options",
  "patch",
] as const;

export interface Router<T> {
  add(method: string, pathname: string, handler: T): void;
  match(method: string, pathname: string): Result<T>;
}

export type Params = Record<string, string>;
export type Pathname = string;
export type Result<T> = [[T, Params, Pathname][]];
/*
The router returns the result of `match` in either format.

[[handler, paramIndexMap][], paramArray]
e.g.
[
  [
    [middlewareA, {}],                     // '*'
    [funcA,       {'id': 0}],              // '/user/:id/*'
    [funcB,       {'id': 0, 'action': 1}], // '/user/:id/:action'
  ],
  ['123', 'abc']
]

[[handler, params][]]
e.g.
[
  [
    [middlewareA, {}],                             // '*'
    [funcA,       {'id': '123'}],                  // '/user/:id/*'
    [funcB,       {'id': '123', 'action': 'abc'}], // '/user/:id/:action'
  ]
]
*/

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

            if (value !== undefined) {
              params[key] = decodeURIComponent(value);
            }
          }
          handlers.push([handler, params, pattern.pathname]);
        }
      }
    }

    return [handlers];
  }
}
