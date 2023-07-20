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
  meta: Meta;
  params: Record<string, string>;
  render: (
    userRenderContext: {
      data?: Data;
      meta?: Meta;
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
  meta: Meta;

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
  meta?: Meta;
  render: Render<unknown>;
}

export interface Route<Data = any> {
  component?: any;
  csp: boolean;
  handler: Handler<Data> | Handlers<Data>;
  meta: Meta;
  name: string;
  pathname: string;
  render: Render<Data>;
}

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
  meta: Meta;
  render: (
    userRenderContext: {
      meta?: Meta;
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
  meta?: Meta;
  render: Render;
}

export interface UnknownPage {
  component?: any;
  csp: boolean;
  handler: UnknownHandler;
  meta: Meta;
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
  meta: Meta;
  error: unknown;
  render: (
    userRenderContext: {
      meta?: Meta;
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
  meta?: Meta;
  render: Render;
}

export interface ErrorPage {
  component?: any;
  csp: boolean;
  handler: ErrorHandler;
  meta: Meta;
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

// --- META ---

/**
 * HTML Metadata
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta
 */
export interface Meta {
  readonly lang?: DocumentLang;
  /**
   * Arbitrary object containing custom data. When the document head is created from
   * markdown files, the frontmatter attributes that are not recognized as a well-known
   * meta names (such as title, description, author, etc...), are stored in this property.
   */
  // readonly frontmatter?: Readonly<Record<string, any>>;

  // --------------------------------------------------------------------------

  /**
   * The Document Base URL element.
   */
  readonly base?: DocumentBase;
  /**
   * Sets `document.title`.
   */
  readonly title?: DocumentTitle;
  /**
   * Used to manually set meta tags in the head. Additionally, the `data`
   * property could be used to set arbitrary data which the `<head>` component
   * could later use to generate `<meta>` tags.
   */
  readonly meta?: readonly DocumentMeta[] | DocumentMeta;
  /**
   * Used to manually append `<link>` elements to the `<head>`.
   */
  readonly link?: readonly DocumentLink[] | DocumentLink;
  /**
   * Used to manually append `<style>` elements to the `<head>`.
   */
  readonly style?: readonly DocumentStyle[] | DocumentStyle;
  /**
   * Used to manually append `<script>` elements to the `<head>`.
   */
  readonly script?: readonly DocumentScript[] | DocumentScript;
}

export type DocumentLang = string;

export type DocumentBase = {
  /** Gets or sets the baseline URL on which relative links are based. */
  readonly href?: string;
  /** Sets or retrieves the window or frame at which to target content. */
  readonly target?: string;
};

export type DocumentTitle = string;

export interface DocumentMeta {
  /** This attribute declares the document's character encoding. */
  readonly charset?: string;
  /** Gets or sets meta-information to associate with httpEquiv or name. */
  readonly content?: string;
  /** Gets or sets information used to bind the value of a content attribute of a meta element to an HTTP response header. */
  readonly httpEquiv?: string;
  readonly media?: string;
  /** Sets or retrieves the value specified in the content attribute of the meta object. */
  readonly name?: string;

  /** NOTE: FaceBook OpenGraph */
  readonly property?: string;
}

export interface DocumentLink {
  readonly as?: string;
  readonly crossOrigin?: string | null | boolean;
  readonly disabled?: boolean;
  /** Sets or retrieves a destination URL or an anchor point. */
  readonly href?: string;
  /** Sets or retrieves the language code of the object. */
  readonly hreflang?: string;
  readonly imageSizes?: string;
  readonly imageSrcset?: string;
  readonly integrity?: string;
  /** Sets or retrieves the media type. */
  readonly media?: string;
  readonly referrerPolicy?: string;
  /** Sets or retrieves the relationship between the object and the destination of the link. */
  readonly rel?: string;
  // readonly relList: DOMTokenList;
  /** Sets or retrieves the MIME type of the object. */
  readonly type?: string;
}

export interface DocumentStyle {
  readonly style?: string;
  /** Enables or disables the style sheet. */
  readonly disabled?: boolean;
  /** Sets or retrieves the media type. */
  readonly media?: string;
}

export interface DocumentScript {
  readonly script?: string | JSONValue;
  readonly async?: boolean;
  readonly crossOrigin?: string | null;
  /** Sets or retrieves the status of the script. */
  readonly defer?: boolean;
  readonly integrity?: string;
  readonly noModule?: boolean;
  readonly referrerPolicy?: string;
  /** Retrieves the URL to an external file that contains the source code or data. */
  readonly src?: string;
  /** Retrieves or sets the text of the object as a string. */
  // readonly text: string;
  /** Sets or retrieves the MIME type for the associated scripting engine. */
  readonly type?: string;
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
