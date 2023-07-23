export type Module<Data> = WidgetModule<Data> | RouteModule<Data>;

// --- WIDGET ---

export interface WidgetModule<Data> {
  default?: WidgetComponent<Data> | any;
  meta?: WidgetMeta;
  render: WidgetRender<Data>;
}

export interface WidgetMeta {
  description?: string;
  keywords?: string;
  lang?: string;
  link?: LinkDescriptor[];
  meta?: MetaDescriptor[];
  style?: StyleDescriptor[];
  title?: string;
}

export type WidgetRenderContext<Data> =
  | ServerWidgetRenderContext<Data>
  | ClientWidgetRenderContext<Data>;

export interface ServerWidgetRenderContext<Data> {
  /**
   * Components defined by the UI framework.
   */
  component?: WidgetComponent<Data> | any;

  /**
   * Props of a component.
   */
  data: Data;

  /**
   * Metadata for widget.
   */
  meta?: WidgetMeta;
}

export interface ClientWidgetRenderContext<Data> {
  /**
   * Components defined by the UI framework.
   */
  component?: WidgetComponent<Data> | any;

  /**
   * The target element for component rendering.
   */
  container: Element;

  /**
   * Props of a component.
   */
  data: Data;

  /**
   * Metadata for widget.
   */
  meta?: WidgetMeta;

  /**
   * The widget has been rendered by the server, the client should continue to render.
   */
  recovering: boolean;
}

export type WidgetRenderResult =
  | ServerWidgetRenderResult
  | ClientWidgetRenderResult;

export type ServerWidgetRenderResult = string | ReadableStream;

export type ClientWidgetRenderResult = void | {
  mount?: () => void | Promise<void>;
  unmount?: () => void | Promise<void>;
  /**@experimental*/
  update?: ({ data }: { data: Record<string, any> }) => void | Promise<void>;
};

export interface WidgetRender<Data> {
  (renderContext: WidgetRenderContext<Data>): Promise<WidgetRenderResult>;
}

export interface WidgetComponent<Data> {
  (data: Data): any;
}

// --- WIDGET: ERROR---

export interface WidgetErrorModule<Error> extends WidgetModule<null> {
  default?: WidgetErrorComponent<Error> | any;
}

export interface WidgetErrorComponentProps<Error> {
  /** The error that caused the error page to be loaded. */
  error: Error;
}

export interface WidgetErrorComponent<Error>
  extends WidgetComponent<WidgetErrorComponentProps<Error>> {}

// --- ROUTE ---

export interface RouteModule<Data> extends WidgetModule<Data> {
  config?: RouteConfig;
  default?: RouteComponent<Data> | any;
  handler?: RouteHandler<Data> | RouteHandlers<Data>;
  meta?: RouteMeta;
  render: RouteRender<Data>;
}

export interface RouteConfig extends Record<string, any> {}

export interface RouteComponentProps<Data, Params = Record<string, string>> {
  /**
   * Additional data passed into `RouteHandlerContext.render`. Defaults to
   * `undefined`.
   */
  data: Data;

  /**
   * The parameters that were matched from the route.
   *
   * For the `/foo/:bar` route with url `/foo/123`, `params` would be
   * `{ bar: '123' }`. For a route with no matchers, `params` would be `{}`. For
   * a wildcard route, like `/foo/:path*` with url `/foo/bar/baz`, `params` would
   * be `{ path: 'bar/baz' }`.
   */
  params: Params;

  /** The route matcher (e.g. /blog/:id) that the request matched for this page
   * to be rendered. */
  route: string;

  /** The URL of the request that resulted in this page being rendered. */
  url: URL;
}

export interface RouteComponent<Data, Params = Record<string, string>>
  extends WidgetComponent<Data> {
  (routeProps: RouteComponentProps<Data, Params>): any;
}

export interface RouteHandlerContext<Data, State = Record<string, unknown>> {
  meta: RouteMeta;
  params: Record<string, string>;
  render: RouteHandlerContextRender<Data>;
  state: State;
}

export interface RouteHandlerContextRender<Data> {
  (
    props: {
      data?: Data;
      meta?: RouteMeta;
    },
    options?: ResponseInit
  ): RouteHandlerContextRenderResult | Promise<RouteHandlerContextRenderResult>;
}

export type RouteHandlerContextRenderResult =
  | ServerRouteHandlerContextRenderResult
  | ClientRouteHandlerContextRenderResult;

export type ServerRouteHandlerContextRenderResult = Response;

export type ClientRouteHandlerContextRenderResult = void;

export interface RouteHandler<Data, State = Record<string, unknown>> {
  (req: Request, ctx: RouteHandlerContext<Data, State>):
    | RouteHandlerContextRenderResult
    | Promise<RouteHandlerContextRenderResult>;
}

export type RouteHandlers<Data, State = Record<string, unknown>> = {
  [K in
    | "GET"
    | "HEAD"
    | "POST"
    | "PUT"
    | "DELETE"
    | "OPTIONS"
    | "PATCH"]?: RouteHandler<Data, State>;
};

export interface RouteMeta extends WidgetMeta {
  base?: string;
  script?: ScriptDescriptor[];
}

export interface RouteRenderContext<Data, Params = Record<string, string>>
  extends WidgetRender<Data> {
  /**
   * Components defined by the UI framework.
   */
  component?: RouteComponent<Data, Params> | any;

  /**
   * Additional data passed into `RouteHandlerContext.render`. Defaults to
   * `undefined`.
   */
  data: Data;

  /**
   * Add tags such as meta to the page. Defaults to `{}`.
   */
  meta: RouteMeta;

  /**
   * The parameters that were matched from the route.
   *
   * For the `/foo/:bar` route with url `/foo/123`, `params` would be
   * `{ bar: '123' }`. For a route with no matchers, `params` would be `{}`. For
   * a wildcard route, like `/foo/:path*` with url `/foo/bar/baz`, `params` would
   * be `{ path: 'bar/baz' }`.
   */
  params: Params;

  /** The route matcher (e.g. /blog/:id) that the request matched for this page
   * to be rendered. */
  route: string;

  /** The URL of the request that resulted in this page being rendered. */
  url: URL;
}

export type RouteRenderResult = WidgetRenderResult;

export type ServerRouteRenderResult = ServerWidgetRenderResult;

export type ClientRouteRenderResult = ClientWidgetRenderResult;

export interface RouteRender<Data> extends WidgetRender<Data> {
  (renderContext: RouteRenderContext<Data>): Promise<RouteRenderResult>;
}

// --- ROUTE: ERROR---

export interface RouteErrorModule<Error> extends RouteModule<null> {
  default?: RouteErrorComponent<Error> | any;
  handler?: ErrorRouteHandler<Error>;
}

export interface RouteErrorComponentProps<Error>
  extends RouteComponentProps<null> {
  /** The error that caused the error page to be loaded. */
  error: Error;
}

export interface RouteErrorComponent<Error>
  extends RouteComponent<RouteErrorComponentProps<Error>> {}

export interface RouteErrorHandlerContext<Error = unknown>
  extends RouteHandlerContext<null> {
  /** The error that caused the error page to be loaded. */
  error: Error;
}
export interface ErrorRouteHandler<Error> extends RouteHandler<null> {
  (req: Request, ctx: RouteErrorHandlerContext<Error>):
    | Response
    | Promise<Response>;
}

// --- META ---

export interface MetaDescriptor {
  /** This attribute declares the document's character encoding. */
  charset?: string;
  /** Gets or sets meta-information to associate with httpEquiv or name. */
  content?: string;
  /** Gets or sets information used to bind the value of a content attribute of a meta element to an HTTP response header. */
  "http-equiv"?: string;
  media?: string;
  /** Sets or retrieves the value specified in the content attribute of the meta object. */
  name?: string;

  /** NOTE: OpenGraph */
  property?: string;
}

export interface LinkDescriptor {
  as?: string;
  crossorigin?: string;
  disabled?: string;
  /** Sets or retrieves a destination URL or an anchor point. */
  href?: string;
  /** Sets or retrieves the language code of the object. */
  hreflang?: string;
  imagesizes?: string;
  imagesrcset?: string;
  integrity?: string;
  /** Sets or retrieves the media type. */
  media?: string;
  referrerpolicy?: string;
  /** Sets or retrieves the relationship between the object and the destination of the link. */
  rel?: string;
  /** Sets or retrieves the MIME type of the object. */
  type?: string;
}

export interface StyleDescriptor {
  /** Sets or retrieves the `style.textContent`. */
  content?: string;
  /** Enables or disables the style sheet. */
  disabled?: string;
  /** Sets or retrieves the media type. */
  media?: string;
}

export interface ScriptDescriptor {
  /** Sets or retrieves the `script.textContent`. */
  content?: string;
  async?: string;
  crossorigin?: string;
  /** Sets or retrieves the status of the script. */
  defer?: string;
  integrity?: string;
  nomodule?: string;
  referrerpolicy?: string;
  /** Retrieves the URL to an external file that contains the source code or data. */
  src?: string;
  /** Retrieves or sets the text of the object as a string. */
  //  text: string;
  /** Sets or retrieves the MIME type for the associated scripting engine. */
  type?: string;
}
