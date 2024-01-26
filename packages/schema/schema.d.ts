////////////////////////////////////////
//////                            //////
//////       Widget Modules       //////
//////                            //////
////////////////////////////////////////

export type WidgetModule = ServerWidgetModule | ClientWidgetModule;

export interface ServerWidgetModule {
  default?: WidgetComponent;
  fallback?: WidgetFallbackComponent;
  meta?: Meta;
  render?: ServerWidgetRender;
}

export interface ClientWidgetModule {
  default?: WidgetComponent;
  fallback?: WidgetFallbackComponent;
  meta?: Meta;
  render?: ClientWidgetRender;
}

export type WidgetComponentProps<Data = unknown> = Data;

export type WidgetComponent<Data = unknown> = (
  data: WidgetComponentProps<Data>
) => any;

export type WidgetFallbackComponentProps = {
  name: string;
  message: string;
  stack?: string;
};

export type WidgetFallbackComponent = (
  props: WidgetFallbackComponentProps
) => any;

export type WidgetError = Error;

export type WidgetRenderContext<Data = unknown> =
  | ServerWidgetRenderContext<Data>
  | ClientWidgetRenderContext<Data>;

export interface ServerWidgetRenderContext<Data = unknown> {
  data?: Data;
  children?: ServerWidgetRenderResult;
  error?: WidgetError;
  meta: Meta;
  module: ServerWidgetModule;
}

export interface ClientWidgetRenderContext<Data = unknown> {
  data?: Data;
  children?: ClientWidgetRenderResult;
  error?: WidgetError;
  meta: Meta;
  module: ClientWidgetModule;
  /** The target element for component rendering. */
  container: Element | DocumentFragment;
  /** The component resumes running on the client side. */
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

export type WidgetRenderOptions<Options = unknown> = Options;

export type WidgetRender<Data = unknown, Options = unknown> =
  | ServerWidgetRender<Data, Options>
  | ClientWidgetRender<Data, Options>;

export interface ServerWidgetRender<Data = unknown, Options = unknown> {
  (
    renderContext: WidgetRenderContext<Data>,
    renderOptions?: WidgetRenderOptions<Options>
  ): ServerWidgetRenderResult | Promise<ServerWidgetRenderResult>;
}

export interface ClientWidgetRender<Data = unknown, Options = unknown> {
  (
    renderContext: WidgetRenderContext<Data>,
    renderOptions?: WidgetRenderOptions<Options>
  ): ClientWidgetRenderResult | Promise<ClientWidgetRenderResult>;
}

////////////////////////////////////////
//////                            //////
//////        Route Modules       //////
//////                            //////
////////////////////////////////////////

export interface RouteModule {
  default?: RouteComponent;
  fallback?: RouteFallbackComponent;
  handler?: RouteHandler | RouteHandlers;
  meta?: Meta;
  render?: RouteRender;
}

export type RouteComponentProps<
  Data = unknown,
  Params = Record<string, string>,
> = {
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
  pathname: string;

  /**
   * Web request api.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Request
   */
  request: Request;
};

export type RouteComponent<Data = unknown, Params = Record<string, string>> = (
  props: RouteComponentProps<Data, Params>
) => any;

export type RouteFallbackComponentProps = RouteError;

export type RouteFallbackComponent = (
  props: RouteFallbackComponentProps
) => any;

export type RouteError = {
  expose?: boolean;
  status?: number;
  statusText?: string;
} & Error;

export type RouteHandlers<
  Data = unknown,
  Params = Record<string, string>,
  State = Record<string, unknown>,
  Options = unknown,
> = {
  [K in
    | "GET"
    | "HEAD"
    | "POST"
    | "PUT"
    | "DELETE"
    | "OPTIONS"
    | "PATCH"]?: RouteHandler<Data, Params, State, Options>;
};

export interface RouteHandler<
  Data = unknown,
  Params = Record<string, string>,
  State = Record<string, unknown>,
  Options = unknown,
> {
  (
    context: RouteHandlerContext<Data, Params, State, Options>
  ): RouteHandlerResult | Promise<RouteHandlerResult>;
}

export interface RouteHandlerContext<
  Data = undefined,
  Params = Record<string, string>,
  State = Record<string, unknown>,
  Options = unknown,
> {
  error?: RouteError;
  data?: Data;
  meta: Meta;
  module: RouteModule;
  name?: string;
  params: Params;
  pathname: string;
  render(
    renderProps?: {
      data?: Data;
      error?: RouteError;
      meta?: Meta;
    },
    renderOptions?: RouteRenderOptions<Options>
  ): RouteHandlerResult | Promise<RouteHandlerResult>;
  renderOptions: RouteRenderOptions<Options>;
  request: Request;
  state: State;
}

export interface RouteRenderContext<
  Data = unknown,
  Params = Record<string, string>,
> {
  data?: Data;
  error?: RouteError;
  meta: Meta;
  module: RouteModule;

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
  pathname: string;

  /**
   * Web request api.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Request
   */
  request: Request;
}

export type RouteRenderOptions<Options = unknown> = Options & ResponseInit;

export type RouteRenderResult = string | ReadableStream;

export type RouteHandlerResult = Response;

export interface RouteRender<
  Data = unknown,
  Params = Record<string, string>,
  Options = unknown,
> {
  (
    renderContext: RouteRenderContext<Data, Params>,
    renderOptions?: RouteRenderOptions<Options>
  ): RouteRenderResult | Promise<RouteRenderResult>;
}

////////////////////////////////////////
//////                            //////
//////     Middleware Modules     //////
//////                            //////
////////////////////////////////////////

export interface MiddlewareModule {
  handler?: MiddlewareHandler | MiddlewareHandlers;
}

export interface MiddlewareHandler {
  (
    context: MiddlewareContext,
    next: MiddlewareNext
  ): MiddlewareResult | Promise<MiddlewareResult>;
}

export type MiddlewareHandlers = {
  [K in
    | "GET"
    | "HEAD"
    | "POST"
    | "PUT"
    | "DELETE"
    | "OPTIONS"
    | "PATCH"]?: MiddlewareHandler;
};

export interface MiddlewareContext extends Partial<RouteHandlerContext> {
  params: Record<string, string>;
  pathname: string;
  request: Request;
  state: Record<string, unknown>;
}

export interface MiddlewareNext {
  (): MiddlewareResult | Promise<MiddlewareResult>;
}

export type MiddlewareResult = Response;

////////////////////////////////////////
//////                            //////
//////            Meta            //////
//////                            //////
////////////////////////////////////////

export interface Meta {
  base?: BaseDescriptor;
  description?: string;
  keywords?: string;
  lang?: string;
  link?: LinkDescriptor[];
  meta?: MetaDescriptor[];
  script?: ScriptDescriptor[];
  style?: StyleDescriptor[];
  title?: string;
}

export interface ElementDescriptor {
  id?: string;
}

export interface BaseDescriptor extends ElementDescriptor {
  /** Gets or sets the baseline URL on which relative links are based. */
  href?: string;
  /** Sets or retrieves the window or frame at which to target content. */
  target?: string;
}

export interface LinkDescriptor extends ElementDescriptor {
  as?: string;
  crossorigin?: string;
  disabled?: string;
  /** A string representing the priority hint. */
  fetchpriority?: "high" | "low" | "auto";
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

export interface MetaDescriptor extends ElementDescriptor {
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

export interface ScriptDescriptor extends ElementDescriptor {
  async?: string;
  /** Sets or retrieves the `script.textContent`. */
  content?: string;
  crossorigin?: string;
  /** Sets or retrieves the status of the script. */
  defer?: string;
  /** A string representing the priority hint. */
  fetchpriority?: "high" | "low" | "auto";
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

export interface StyleDescriptor extends ElementDescriptor {
  /** Sets or retrieves the `style.textContent`. */
  content?: string;
  /** Enables or disables the style sheet. */
  disabled?: string;
  /** Sets or retrieves the media type. */
  media?: string;
}

// export interface TitleDescriptor {
//   content?: string;
// }

////////////////////////////////////////
//////                            //////
//////           (...)            //////
//////                            //////
////////////////////////////////////////

export type Module = ServerModule | ClientModule;

export type ServerModule = ServerWidgetModule | RouteModule | MiddlewareModule;

export type ClientModule = ClientWidgetModule | RouteModule;

export type Handlers<
  Data = unknown,
  Params = Record<string, string>,
  State = Record<string, unknown>,
  Options = unknown,
> = RouteHandlers<Data, Params, State, Options> | MiddlewareHandlers;

export type Handler<
  Data = unknown,
  Params = Record<string, string>,
  State = Record<string, unknown>,
  Options = unknown,
> = RouteHandler<Data, Params, State, Options> | MiddlewareHandler;

export type ComponentProps<Data = unknown, Params = Record<string, string>> =
  | WidgetComponentProps<Data>
  | RouteComponentProps<Data, Params>;

export type Component<Data = unknown, Params = Record<string, string>> =
  | WidgetComponent<Data>
  | RouteComponent<Data, Params>;

export type RenderContext<Data = unknown, Params = Record<string, string>> =
  | RouteRenderContext<Data, Params>
  | WidgetRenderContext<Data>;

export type Render<
  Data = unknown,
  Params = Record<string, string>,
  Options = unknown,
> = ServerRender<Data, Params, Options> | ClientRender<Data, Params, Options>;

export type ServerRender<
  Data = unknown,
  Params = Record<string, string>,
  Options = unknown,
> = ServerWidgetRender<Data, Options> | RouteRender<Data, Params, Options>;

export type ClientRender<
  Data = unknown,
  Params = Record<string, string>,
  Options = unknown,
> = ClientWidgetRender<Data, Options> | RouteRender<Data, Params, Options>;
