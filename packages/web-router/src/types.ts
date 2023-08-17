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
} from "@web-widget/schema/server-helpers";
import type { RootRenderContext } from "./render";

// --- MODULE STANDARDS---

export * from "@web-widget/schema/server-helpers";

// --- APPLICATION CONFIGURATION ---

export type StartOptions = WebRouterOptions & {
  dev?: boolean;
};

export interface WebRouterOptions {
  baseAsset: URL | string;
  baseModule: URL | string;
  defaultBootstrap?: ScriptDescriptor[];
  defaultMeta?: Meta;
  origin?: string;
  experimental?: {
    loader?: (module: string, importer?: string) => Promise<unknown>;
    render?: RootRender;
    router?: RouterOptions;
  };
}

export interface RouterOptions {
  /**
   *  Controls whether Fresh will append a trailing slash to the URL.
   *  @default {false}
   */
  trailingSlash?: boolean;
}

export type { RootRenderContext };

export type ChildrenRender = () => Promise<RouteRenderResult>;

export type RootRender = (
  ctx: RootRenderContext,
  render: ChildrenRender
) => void | Promise<void>;

export type RouterHandler = (
  request: Request,
  requester?: Requester
) => Response | Promise<Response>;

// Information about the connection a request arrived on.
export type Requester = FetchEvent | unknown;

// --- MANIFEST ---

export type Manifest = ManifestResolved | ManifestJSON;

export interface ManifestResolved {
  routes?: {
    module: RouteModule;
    name?: string;
    pathname: string;
    source: string;
  }[];
  middlewares?: {
    module: MiddlewareModule;
    name?: string;
    pathname: string;
    source: string;
  }[];
  fallbacks?: {
    module: RouteModule;
    name: string;
    pathname: string;
    source: string;
  }[];
  layout?: {
    module: LayoutModule;
    source: string;
    name?: string;
  };
}

export interface ManifestJSON {
  $schema?: string;
  routes?: {
    module: string;
    name?: string;
    pathname: string;
  }[];
  middlewares?: {
    module: string;
    name?: string;
    pathname: string;
  }[];
  fallbacks?: {
    module: string;
    name: string;
    pathname: string;
  }[];
  layout?: {
    module: string;
    name?: string;
  };
}

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
  source: URL;
}

// --- MIDDLEWARE ---

export interface MiddlewareModule {
  handler: MiddlewareHandler | MiddlewareHandler[];
}

export type MiddlewareHandler<State = Record<string, unknown>> = (
  ctx: MiddlewareHandlerContext<State>,
  next: () => Promise<Response>
) => Response | Promise<Response>;

export interface MiddlewareHandlerContext<State = Record<string, unknown>> {
  destination: router.DestinationKind;
  request: Request;
  requester?: Requester;
  state: State;
}

export interface Middleware {
  handler: MiddlewareHandler | MiddlewareHandler[];
  /**
   * path-to-regexp style url path
   */
  pathname: string;
  /**
   * URLPattern of the route
   */
  compiledPattern: URLPattern;
}

// --- LAYOUT ---

export interface LayoutModule extends WidgetModule {}
export type LayoutComponentProps = WidgetComponentProps;
export interface LayoutComponent extends WidgetComponent {}
export interface LayoutRenderContext extends WidgetRenderContext {}
export type LayoutRenderResult = WidgetRenderResult;
export interface LayoutRender extends WidgetRender {}

export interface Layout {
  bootstrap: ScriptDescriptor[];
  meta: Meta;
  module: LayoutModule;
  name: string;
  render: WidgetRender;
  source: URL;
}

export interface RootLayoutComponentProps {
  children: RouteRenderResult;
  bootstrap: ScriptDescriptor[];
  meta: Meta;
}
