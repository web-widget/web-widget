// --- WIDGET ---

export type WidgetModule = ServerWidgetModule | ClientWidgetModule;

export interface ServerWidgetModule {
  default?: WidgetComponent;
  config?: WidgetConfig;
  fallback?: WidgetFallbackComponent;
  meta?: Meta;
  render?: ServerWidgetRender;
}

export interface ClientWidgetModule {
  default?: WidgetComponent;
  config?: WidgetConfig;
  fallback?: WidgetFallbackComponent;
  meta?: Meta;
  render?: ClientWidgetRender;
}

export type WidgetConfig = {
  renderOptions?: WidgetRenderOptions;
} & Record<string, any>;

export type WidgetComponentProps<Data = unknown> = Data;

export type WidgetComponent<Data = unknown> =
  | ((data: WidgetComponentProps<Data>) => any)
  | any;

export type WidgetFallbackComponentProps = {
  name: string;
  message: string;
  stack?: string;
};

export type WidgetFallbackComponent =
  | ((props: WidgetFallbackComponentProps) => any)
  | any;

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

  // -----------------------------------------------------
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

export type WidgetRenderOptions = any;

export type WidgetRender<Data = unknown> =
  | ServerWidgetRender<Data>
  | ClientWidgetRender<Data>;

export interface ServerWidgetRender<Data = unknown> {
  (
    renderContext: WidgetRenderContext<Data>,
    renderOptions?: WidgetRenderOptions
  ): ServerWidgetRenderResult | Promise<ServerWidgetRenderResult>;
}

export interface ClientWidgetRender<Data = unknown> {
  (
    renderContext: WidgetRenderContext<Data>,
    renderOptions?: WidgetRenderOptions
  ): ClientWidgetRenderResult | Promise<ClientWidgetRenderResult>;
}

// --- ROUTE ---

export type RouteModule = ServerRouteModule | ClientRouteModule;

export interface ServerRouteModule {
  config?: RouteConfig;
  default?: RouteComponent;
  fallback?: RouteFallbackComponent;
  handler?: ServerRouteHandler | ServerRouteHandlers;
  meta?: Meta;
  render?: ServerRouteRender;
}

export interface ClientRouteModule {
  config?: RouteConfig;
  default?: RouteComponent;
  fallback?: RouteFallbackComponent;
  handler?: ClientRouteHandler | ClientRouteHandlers;
  meta?: Meta;
  render?: ClientRouteRender;
}

export type RouteConfig = Record<string, any>;

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

  request: Request;

  /** The route matcher (e.g. /blog/:id) that the request matched for this page
   * to be rendered. */
  pathname: string;
};

export type RouteComponent<Data = unknown, Params = Record<string, string>> =
  | ((props: RouteComponentProps<Data, Params>) => any)
  | any;

export type RouteFallbackComponentProps = {
  name: string;
  message: string;
  stack?: string;
  status?: number;
  statusText?: string;
};

export type RouteFallbackComponent =
  | ((props: RouteFallbackComponentProps) => any)
  | any;

export type RouteError = Error | HttpError;

export type RouteHandlers<
  Data = unknown,
  Params = Record<string, string>,
  State = Record<string, unknown>,
> =
  | ServerRouteHandlers<Data, Params, State>
  | ClientRouteHandlers<Data, Params, State>;

export type ServerRouteHandlers<
  Data = unknown,
  Params = Record<string, string>,
  State = Record<string, unknown>,
> = {
  [K in
    | "GET"
    | "HEAD"
    | "POST"
    | "PUT"
    | "DELETE"
    | "OPTIONS"
    | "PATCH"]?: ServerRouteHandler<Data, Params, State>;
};

export type ClientRouteHandlers<
  Data = unknown,
  Params = Record<string, string>,
  State = Record<string, unknown>,
> = {
  [K in "GET"]?: ClientRouteHandler<Data, Params, State>;
};

export type RouteHandler<
  Data = unknown,
  Params = Record<string, string>,
  State = Record<string, unknown>,
> =
  | ServerRouteHandler<Data, Params, State>
  | ClientRouteHandler<Data, Params, State>;

export interface ServerRouteHandler<
  Data = unknown,
  Params = Record<string, string>,
  State = Record<string, unknown>,
> {
  (
    ctx: ServerRouteHandlerContext<Data, Params, State>
  ): ServerRouteHandlerResult | Promise<ServerRouteHandlerResult>;
}

export interface ClientRouteHandler<
  Data = unknown,
  Params = Record<string, string>,
  State = Record<string, unknown>,
> {
  (
    ctx: ClientRouteHandlerContext<Data, Params, State>
  ): ClientRouteHandlerResult | Promise<ClientRouteHandlerResult>;
}

export type RouteHandlerContext<
  Data = undefined,
  Params = Record<string, string>,
  State = Record<string, unknown>,
> =
  | ServerRouteHandlerContext<Data, Params, State>
  | ClientRouteHandlerContext<Data, Params, State>;

export interface ServerRouteHandlerContext<
  Data = undefined,
  Params = Record<string, string>,
  State = Record<string, unknown>,
> {
  error?: RouteError;
  meta: Meta;
  module: ServerRouteModule;
  name?: string;
  params: Params;
  pathname: string;
  render(
    renderProps?: {
      data?: Data;
      error?: RouteError;
      meta?: Meta;
    },
    renderOptions?: RouteRenderOptions
  ): ServerRouteHandlerResult | Promise<ServerRouteHandlerResult>;
  request: Request;
  state: State;
}

export interface ClientRouteHandlerContext<
  Data = undefined,
  Params = Record<string, string>,
  State = Record<string, unknown>,
> {
  error?: RouteError;
  meta: Meta;
  module: ClientRouteModule;
  name?: string;
  params: Params;
  pathname: string;
  render(
    renderProps?: {
      data?: Data;
      error?: RouteError;
      meta?: Meta;
    },
    renderOptions?: RouteRenderOptions
  ): ClientRouteHandlerResult | Promise<ClientRouteHandlerResult>;
  request: Request;
  state: State;
}

export type RouteRenderContext<
  Data = unknown,
  Params = Record<string, string>,
> =
  | ServerRouteRenderContext<Data, Params>
  | ClientRouteRenderContext<Data, Params>;

export interface ServerRouteRenderContext<
  Data = unknown,
  Params = Record<string, string>,
> {
  data?: Data;
  error?: RouteError;
  meta: Meta;
  module: ServerRouteModule;

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

  request: Request;
}

export interface ClientRouteRenderContext<
  Data = unknown,
  Params = Record<string, string>,
> {
  data?: Data;
  error?: RouteError;
  meta: Meta;
  module: ClientRouteModule;

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

  request: Request;

  // ... Client only ...

  /** The target element for component rendering. */
  container: Element | DocumentFragment;

  /** The component resumes running on the client side. */
  recovering: boolean;
}

export type RouteRenderOptions = ResponseInit & any;

export type RouteRenderResult =
  | ServerRouteRenderResult
  | ClientRouteRenderResult;

export type ServerRouteRenderResult = string | ReadableStream;

export type ClientRouteRenderResult = void | {
  mount?: () => void | Promise<void>;
  unmount?: () => void | Promise<void>;
  update?: ({ data }: { data: Record<string, any> }) => void | Promise<void>;
};

export type RouteHandlerResult =
  | ServerRouteHandlerResult
  | ClientRouteHandlerResult;

export type ServerRouteHandlerResult = Response;

export type ClientRouteHandlerResult = void | {
  mount?: () => void | Promise<void>;
  unmount?: () => void | Promise<void>;
};

export type RouteRender<Data = unknown, Params = Record<string, string>> =
  | ServerRouteRender<Data, Params>
  | ClientRouteRender<Data, Params>;

export interface ServerRouteRender<
  Data = unknown,
  Params = Record<string, string>,
> {
  (
    renderContext: RouteRenderContext<Data, Params>,
    renderOptions?: RouteRenderOptions
  ): ServerRouteRenderResult | Promise<ServerRouteRenderResult>;
}

export interface ClientRouteRender<
  Data = unknown,
  Params = Record<string, string>,
> {
  (
    renderContext: RouteRenderContext<Data, Params>,
    renderOptions?: RouteRenderOptions
  ): ClientRouteRenderResult | Promise<ClientRouteRenderResult>;
}

// --- META: DESCRIPTOR ---

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

// --- ROOT ---

export type Module = ServerModule | ClientModule;

export type ServerModule = ServerWidgetModule | ServerRouteModule;

export type ClientModule = ClientWidgetModule | ClientRouteModule;

export type Config = WidgetConfig | RouteConfig;

export type Handlers<
  Data = unknown,
  Params = Record<string, string>,
> = RouteHandlers<Data, Params>;

export type Handler<
  Data = unknown,
  Params = Record<string, string>,
> = RouteHandler<Data, Params>;

export type ComponentProps<Data = unknown, Params = Record<string, string>> =
  | WidgetComponentProps<Data>
  | RouteComponentProps<Data, Params>;

export type Component<Data = unknown, Params = Record<string, string>> =
  | WidgetComponent<Data>
  | RouteComponent<Data, Params>;

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

export type RenderContext<Data = unknown, Params = Record<string, string>> =
  | ServerRenderContext<Data, Params>
  | ClientRenderContext<Data, Params>;

export type ServerRenderContext<
  Data = unknown,
  Params = Record<string, string>,
> = ServerWidgetRenderContext<Data> | ServerRouteRenderContext<Data, Params>;

export type ClientRenderContext<
  Data = unknown,
  Params = Record<string, string>,
> = ClientWidgetRenderContext<Data> | ClientRouteRenderContext<Data, Params>;

export type Render<Data = unknown, Params = Record<string, string>> =
  | ServerRender<Data, Params>
  | ClientRender<Data, Params>;

export type ServerRender<Data = unknown, Params = Record<string, string>> =
  | ServerWidgetRender<Data>
  | ServerRouteRender<Data, Params>;

export type ClientRender<Data = unknown, Params = Record<string, string>> =
  | ClientWidgetRender<Data>
  | ClientRouteRender<Data, Params>;

export type HttpError = {
  name: string;
  message: string;
  stack?: string;
  status: number;
  statusText: string;
};
