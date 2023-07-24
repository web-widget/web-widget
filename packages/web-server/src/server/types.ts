import * as router from "./router";
import { InnerRenderFunction, InnerRenderContext } from "./render";
import type {
  Meta,
  RouteHandler,
  RouteHandlers,
  RouteModule,
  RouteRender,
  RouteConfig as BaseRouterConfig,
} from "@web-widget/schema/server";
export * from "@web-widget/schema/server";

// --- APPLICATION CONFIGURATION ---

export type StartOptions = WebServerOptions & {
  dev?: boolean;
};

export interface WebServerOptions {
  render?: RenderPage;
  router?: RouterOptions;
  client?: {
    base?: string;
  };
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

// --- PAGE ---

export interface RouteConfig extends BaseRouterConfig {
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

export interface Page {
  config: RouteConfig;
  csp: boolean;
  handler: RouteHandler | RouteHandlers;
  meta: Meta;
  name: string;
  pathname: string;
  render: RouteRender;
  module: RouteModule;
}

export interface PageLayoutData {
  clientEntry: string;
  esModulePolyfillUrl: string;
  meta: Meta;
  children: string | ReadableStream;
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
    module: RouteModule;
  };
  error?: {
    name: string;
    pathname: string;
    module: RouteModule;
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
