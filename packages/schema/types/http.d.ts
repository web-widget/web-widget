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

export interface FetchContext<Params = Record<string, string>>
  extends Omit<FetchEventLike, 'respondWith'> {
  /**
   * Errors in the current route.
   */
  error?: HTTPException;

  /**
   * The parameters that were matched from the route.
   *
   * For the `/foo/:bar` route with url `/foo/123`, `params` would be
   * `{ bar: '123' }`. For a route with no matchers, `params` would be `{}`. For
   * a wildcard route, like `/foo/:path*` with url `/foo/bar/baz`, `params` would
   * be `{ path: 'bar/baz' }`.
   */
  params: Readonly<Params>;

  /**
   * The state of the application, the content comes from the middleware.
   */
  readonly state: State;

  /** @deprecated */
  readonly name?: string;

  /**
   * The route matcher (e.g. /blog/:id) that the request matched for this page
   * to be rendered.
   * @deprecated
   */
  readonly pathname: string;
}
