export type SerializableValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: SerializableValue }
  | SerializableValue[];

export interface HTTPException extends Error {
  expose?: boolean;
  status?: number;
  statusText?: string;
}

export interface State extends Record<string, unknown> {}

export type KnownMethods =
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'OPTIONS'
  | 'PATCH';

export type FetchEventLike = Pick<
  FetchEvent,
  'request' | 'respondWith' | 'waitUntil'
>;

export type Scope = {
  username: string;
  password: string;
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
};

export interface FetchContext<Params = Record<string, string>>
  extends Omit<FetchEventLike, 'respondWith'> {
  /**
   * Errors in the current route.
   */
  error?: HTTPException;

  /**
   * The URL of the request.
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/URL)
   */
  readonly url: URL;

  /**
   * Alias for `pathnameParams`. Represents the parameters that were matched from the route.
   *
   * For the `/foo/:bar` route with url `/foo/123`, `params` would be
   * `{ bar: '123' }`. For a route with no matchers, `params` would be `{}`. For
   * a wildcard route, like `/foo/:path*` with url `/foo/bar/baz`, `params` would
   * be `{ path: 'bar/baz' }`.
   */
  readonly params: Readonly<Params>;

  /**
   * The state of the application, the content comes from the middleware.
   */
  readonly state: State;

  /**
   * Matched route.
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern/URLPattern#input)
   */
  readonly scope: Scope;

  /** @deprecated */
  readonly name?: string;

  /**
   * The route matcher (e.g. /blog/:id) that the request matched for this page
   * to be rendered.
   * @deprecated Use `scope.pathname` instead.
   */
  readonly pathname: string;
}
