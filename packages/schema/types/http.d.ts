/**
 * HTTP-related type definitions.
 *
 * This module defines the core HTTP types used throughout the system,
 * including request/response handling, error types, state management,
 * and context objects for middleware and route handlers.
 *
 * @module HTTP Types
 */

/**
 * Represents a value that can be serialized to JSON.
 * This type is used for data that needs to be transmitted over HTTP.
 */
export type SerializableValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: SerializableValue }
  | SerializableValue[];

/**
 * Represents an HTTP error that can be thrown or returned by route handlers.
 * Extends the standard Error interface with HTTP-specific properties.
 */
export interface HTTPException extends Error {
  /** Whether to expose the error details to the client. */
  expose?: boolean;
  /** The HTTP status code for the error. */
  status?: number;
  /** The HTTP status text for the error. */
  statusText?: string;
}

/**
 * Represents the application state that can be shared between middleware and routes.
 * This is a flexible object that can store any serializable data.
 */
export interface State extends Record<string, unknown> {}

/**
 * Represents all valid HTTP methods that can be handled by the framework.
 */
export type KnownMethods =
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'OPTIONS'
  | 'PATCH';

/**
 * A subset of the FetchEvent interface that provides the essential properties
 * needed for request handling in the framework.
 */
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

/**
 * The context object passed to route handlers and middleware.
 * Contains all the information needed to process an HTTP request.
 */
export interface FetchContext<Params = Record<string, string>>
  extends Omit<FetchEventLike, 'respondWith'> {
  /**
   * Errors that occurred during request processing.
   * This is typically set by middleware or previous route handlers.
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
   * This object can be modified by middleware and accessed by route handlers.
   */
  readonly state: State;

  /**
   * Matched route.
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern/URLPattern#input)
   */
  readonly scope: Scope;

  /** @deprecated
   * The name of the current route.
   * @deprecated This property is deprecated and will be removed in a future version.
   */
  readonly name?: string;

  /**
   * The route matcher (e.g. /blog/:id) that the request matched for this page
   * to be rendered.
   * @deprecated Use `scope.pathname` instead.
   */
  readonly pathname: string;
}
