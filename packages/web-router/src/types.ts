import type * as router from "./router";

import type {
  RouteConfig as BaseRouterConfig,
  Meta,
  RouteHandler,
  RouteHandlers,
  RouteModule,
  RouteRender,
  RouteRenderResult,
  ScriptDescriptor,
  WidgetComponent,
  WidgetComponentProps,
  WidgetModule,
  WidgetRender,
  WidgetRenderContext,
  WidgetRenderResult,
} from "@web-widget/schema/server";
import type { InnerRenderContext, InnerRenderFunction } from "./render";

export * from "@web-widget/schema/server";

// --- APPLICATION CONFIGURATION ---

export type StartOptions = WebRouterOptions & {
  dev?: boolean;
};

export interface WebRouterOptions {
  client?: {
    base?: string;
    // bootstrap: ScriptDescriptor[];
  };
  loader?: (module: string) => Promise<any>;
  render?: RenderPage;
  root?: string;
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
  bootstrap: ScriptDescriptor[];
  config: RouteConfig;
  csp: boolean;
  handler: RouteHandler | RouteHandlers;
  meta: Meta;
  module: RouteModule;
  name: string;
  pathname: string;
  render: RouteRender;
  source: string;
}

// --- MIDDLEWARE ---

export interface MiddlewareHandlerContext<State = Record<string, unknown>>
  extends ServerConnInfo {
  destination: router.DestinationKind;
  next: () => Promise<Response>;
  request: Request;
  state: State;
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
  ctx: MiddlewareHandlerContext<State>
) => Response | Promise<Response>;

export interface MiddlewareModule<State = any> {
  handler: MiddlewareHandler<State> | MiddlewareHandler<State>[];
}

export interface Middleware<State = Record<string, unknown>> {
  handler: MiddlewareHandler<State> | MiddlewareHandler<State>[];
}

// --- LAYOUT ---

export interface LayoutModule extends WidgetModule {}
export type LayoutComponentProps = WidgetComponentProps;
export interface LayoutComponent extends WidgetComponent {}
export interface LayoutRenderContext extends WidgetRenderContext {}
export type LayoutRenderResult = WidgetRenderResult;
export interface LayouRender extends WidgetRender {}

export interface Layout {
  bootstrap: ScriptDescriptor[];
  meta: Meta;
  module: LayoutModule;
  name: string;
  render: WidgetRender;
  source: string;
}

export interface RootLayoutComponentProps {
  children: RouteRenderResult;
  bootstrap: ScriptDescriptor[];
  meta: Meta;
}

// --- MANIFEST ---

export interface Manifest {
  $schema?: string;
  routes?: {
    module: string | RouteModule;
    name?: string;
    pathname: string;
    source?: string;
  }[];
  middlewares?: {
    module: string | MiddlewareModule;
    name?: string;
    pathname: string;
    source?: string;
  }[];
  fallbacks?: {
    module: string | RouteModule;
    name: string;
    pathname: string;
    source?: string;
  }[];
  layouts?: {
    module: string | LayoutModule;
    name: string;
    source?: string;
  }[];
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
