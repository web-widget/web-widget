/// <reference types="urlpattern-polyfill" />

import * as router from "./router";
import { InnerRenderFunction, InnerRenderContext } from "./render";

type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

// --- APPLICATION CONFIGURATION ---

export type StartOptions = WebServerOptions & {
  dev?: boolean;
};

export interface WebServerOptions {
  render?: RenderPage;
  router?: RouterOptions;
}

export interface RouterOptions {
  /**
   *  Controls whether Fresh will append a trailing slash to the URL.
   *  @default {false}
   */
  trailingSlash?: boolean;
}

export type RenderPage = (
  ctx: InnerRenderContext,
  render: InnerRenderFunction
) => void | Promise<void>;

/// --- ROUTES & WIDGET ---

export interface ComponentProps<Data> {
  /** The URL of the request that resulted in this page being rendered. */
  url: URL;

  /** The route matcher (e.g. /blog/:id) that the request matched for this page
   * to be rendered. */
  route: string;

  /**
   * The parameters that were matched from the route.
   *
   * For the `/foo/:bar` route with url `/foo/123`, `params` would be
   * `{ bar: '123' }`. For a route with no matchers, `params` would be `{}`. For
   * a wildcard route, like `/foo/:path*` with url `/foo/bar/baz`, `params` would
   * be `{ path: 'bar/baz' }`.
   */
  params: Record<string, string>;

  /**
   * Additional data passed into `HandlerContext.render`. Defaults to
   * `undefined`.
   */
  data: Data;
}

export interface RouteConfig {
  /**
   * A route override for the page. This is useful for pages where the route
   * can not be expressed through the filesystem routing capabilities.
   *
   * The route override must be a path-to-regexp compatible route matcher.
   */
  routeOverride?: string;

  /**
   * If Content-Security-Policy should be enabled for this page.
   */
  csp?: boolean;
}

export interface HandlerContext<Data = unknown, State = Record<string, unknown>>
  extends ServerConnInfo {
  meta: Meta[];
  params: Record<string, string>;
  render: (
    userRenderContext: {
      data?: Data;
      meta?: Meta[];
    },
    options?: ResponseInit
  ) => Response | Promise<Response>;
  renderNotFound: () => Response | Promise<Response>;
  state: State;
}

export type Handler<Data = any, State = Record<string, unknown>> = (
  req: Request,
  ctx: HandlerContext<Data, State>
) => Response | Promise<Response>;

export type Handlers<Data = any, State = Record<string, unknown>> = {
  [K in router.KnownMethod]?: Handler<Data, State>;
};

export interface RouteRenderContext<Data = any> {
  /** The URL of the request that resulted in this page being rendered. */
  url: URL;

  /** The route matcher (e.g. /blog/:id) that the request matched for this page
   * to be rendered. */
  route: string;

  /**
   * The parameters that were matched from the route.
   *
   * For the `/foo/:bar` route with url `/foo/123`, `params` would be
   * `{ bar: '123' }`. For a route with no matchers, `params` would be `{}`. For
   * a wildcard route, like `/foo/:path*` with url `/foo/bar/baz`, `params` would
   * be `{ path: 'bar/baz' }`.
   */
  params: Record<string, string>;

  /**
   * Additional data passed into `HandlerContext.render`. Defaults to
   * `undefined`.
   */
  data: Data;

  /**
   * Add tags such as meta to the page. Defaults to `[]`.
   */
  meta: Meta[];

  /**
   * The error that caused the error page to be loaded.
   */
  error: unknown;

  /**
   * This is a component of the UI framework.
   */
  component?: any;
}

export interface WidgetRenderContext<Data = JSONValue> {
  /**
   * Props of a component.
   */
  data: Data;

  /**
   * The error that caused the error page to be loaded.
   */
  error: unknown;

  /**
   * This is a component of the UI framework.
   */
  component?: any;
}

export interface RenderContext<Data = any>
  extends RouteRenderContext<Data>,
    WidgetRenderContext<Data> {}

export type Render<Data = unknown> = (
  renderContext: RenderContext<Data>
) => Promise<RenderResult>;

export type RenderResult = string | ReadableStream;

export interface RouteModule {
  config?: RouteConfig;
  default?: any;
  handler?: Handler<unknown> | Handlers<unknown>;
  meta?: Meta[];
  render: Render<unknown>;
}

export interface Route<Data = any> {
  component?: any;
  csp: boolean;
  handler: Handler<Data> | Handlers<Data>;
  meta: Meta[];
  name: string;
  pathname: string;
  render: Render<Data>;
}

export type Meta =
  | { charSet: "utf-8" }
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string }
  | { httpEquiv: string; content: string }
  | { "script:ld+json": LdJsonObject }
  | { tagName: "meta" | "link"; [name: string]: string }
  | { [name: string]: unknown };

type LdJsonObject = { [Key in string]: LdJsonValue } & {
  [Key in string]?: LdJsonValue | undefined;
};
type LdJsonArray = LdJsonValue[] | readonly LdJsonValue[];
type LdJsonPrimitive = string | number | boolean | null;
type LdJsonValue = LdJsonPrimitive | LdJsonObject | LdJsonArray;

// --- UNKNOWN PAGE ---

export interface UnknownComponentProps {
  /** The URL of the request that resulted in this page being rendered. */
  url: URL;

  /** The route matcher (e.g. /blog/:id) that the request matched for this page
   * to be rendered. */
  route: string;
}

export interface UnknownHandlerContext<State = Record<string, unknown>>
  extends ServerConnInfo {
  meta: Meta[];
  render: (
    userRenderContext: {
      meta?: Meta[];
    },
    options?: ResponseInit
  ) => Response | Promise<Response>;
  state: State;
}

export type UnknownHandler = (
  req: Request,
  ctx: UnknownHandlerContext
) => Response | Promise<Response>;

export interface UnknownPageModule {
  config?: RouteConfig;
  default?: any;
  handler?: UnknownHandler;
  meta?: Meta[];
  render: Render;
}

export interface UnknownPage {
  component?: any;
  csp: boolean;
  handler: UnknownHandler;
  meta: Meta[];
  name: string;
  pathname: string;
  render: Render;
}

// --- ERROR PAGE ---

export interface ErrorComponentProps {
  /** The URL of the request that resulted in this page being rendered. */
  url: URL;

  /** The route matcher (e.g. /blog/:id) that the request matched for this page
   * to be rendered. */
  pathname: string;

  /** The error that caused the error page to be loaded. */
  error: unknown;
}

export interface ErrorHandlerContext<State = Record<string, unknown>>
  extends ServerConnInfo {
  meta: Meta[];
  error: unknown;
  render: (
    userRenderContext: {
      meta?: Meta[];
    },
    options?: ResponseInit
  ) => Response | Promise<Response>;
  state: State;
}
export type ErrorHandler = (
  req: Request,
  ctx: ErrorHandlerContext
) => Response | Promise<Response>;

export interface ErrorPageModule {
  config?: RouteConfig;
  default?: any;
  handler?: ErrorHandler;
  meta?: Meta[];
  render: Render;
}

export interface ErrorPage {
  component?: any;
  csp: boolean;
  handler: ErrorHandler;
  meta: Meta[];
  name: string;
  pathname: string;
  render: Render;
}

// --- MIDDLEWARES ---

export interface MiddlewareHandlerContext<State = Record<string, unknown>>
  extends ServerConnInfo {
  next: () => Promise<Response>;
  state: State;
  destination: router.DestinationKind;
}

export interface MiddlewareRoute extends Middleware {
  /**
   * path-to-regexp style url path
   */
  pathname: string;
  /**
   * URLPattern of the route
   */
  compiledPattern: URLPattern;
}

export type MiddlewareHandler<State = Record<string, unknown>> = (
  req: Request,
  ctx: MiddlewareHandlerContext<State>
) => Response | Promise<Response>;

export interface MiddlewareModule<State = any> {
  handler: MiddlewareHandler<State> | MiddlewareHandler<State>[];
}

export interface Middleware<State = Record<string, unknown>> {
  handler: MiddlewareHandler<State> | MiddlewareHandler<State>[];
}

// --- MANIFEST ---

export interface Manifest {
  routes: {
    name: string;
    pathname: string;
    module: RouteModule;
  }[];
  middlewares: {
    pathname: string;
    module: MiddlewareModule;
  }[];
  notFound?: {
    name: string;
    pathname: string;
    module: UnknownPageModule;
  };
  error?: {
    name: string;
    pathname: string;
    module: ErrorPageModule;
  };
}

// --- SERVERS ---

/**
 * A handler for HTTP requests. Consumes a request and connection information
 * and returns a response.
 *
 * If a handler throws, the server calling the handler will assume the impact
 * of the error is isolated to the individual request. It will catch the error
 * and close the underlying connection.
 * @see https://deno.land/std@0.178.0/http/server.ts?s=Handler
 */
export type ServerHandler = (
  request: Request,
  connInfo?: ServerConnInfo
) => Response | Promise<Response>;

/**
 * Information about the connection a request arrived on.
 * @see https://deno.land/std@0.178.0/http/server.ts?s=ConnInfo
 */
export interface ServerConnInfo {
  /** The local address of the connection. */
  readonly localAddr?: unknown;
  /** The remote address of the connection. */
  readonly remoteAddr?: unknown;
}
