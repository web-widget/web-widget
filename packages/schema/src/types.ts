// --- WIDGET ---

export type WidgetModule = ServerWidgetModule | ClientWidgetModule;

export interface ServerWidgetModule {
  default?: WidgetComponent | any;
  config?: WidgetConfig;
  fallback?: WidgetFallbackComponent | any;
  meta?: Meta;
  render?: ServerWidgetRender;
}

export interface ClientWidgetModule {
  default?: WidgetComponent | any;
  config?: WidgetConfig;
  fallback?: WidgetFallbackComponent | any;
  meta?: Meta;
  render?: ClientWidgetRender;
}

export type WidgetConfig = Record<string, any>;

export type WidgetComponentProps<Data = unknown> = Data;

export interface WidgetComponent<Data = unknown> {
  (data: WidgetComponentProps<Data>): any;
}

export type WidgetFallbackComponentProps =
  | {
      status: number;
      statusText: string;
    }
  | {
      name: string;
      message: string;
      stack?: string;
    };

export interface WidgetFallbackComponent {
  (props: WidgetFallbackComponentProps): any;
}

export type WidgetError = Error;

export type WidgetRenderContext<Data = unknown> =
  | ServerWidgetRenderContext<Data>
  | ClientWidgetRenderContext<Data>;

export interface ServerWidgetRenderContext<Data = unknown> {
  data?: Data;
  error?: WidgetError;
  meta: Meta;
  module: ServerWidgetModule;
}

export interface ClientWidgetRenderContext<Data = unknown> {
  data?: Data;
  error?: WidgetError;
  meta: Meta;
  module: ClientWidgetModule;

  // -----------------------------------------------------
  /** The target element for component rendering. */
  container: Element;

  /** The component resumes running on the client side. */
  recovering: boolean | "fallback";
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

export type WidgetRender<Data = unknown> =
  | ServerWidgetRender<Data>
  | ClientWidgetRender<Data>;

export interface ServerWidgetRender<Data = unknown> {
  (renderContext: WidgetRenderContext<Data>): Promise<ServerWidgetRenderResult>;
}

export interface ClientWidgetRender<Data = unknown> {
  (renderContext: WidgetRenderContext<Data>): Promise<ClientWidgetRenderResult>;
}

// --- ROUTE ---

export type RouteModule = ServerRouteModule | ClientRouteModule;

export interface ServerRouteModule {
  config?: RouteConfig;
  default?: RouteComponent | any;
  fallback?: RouteFallbackComponent | any;
  handler?: ServerRouteHandler | ServerRouteHandlers;
  meta?: Meta;
  render?: ServerRouteRender;
}

export interface ClientRouteModule {
  config?: RouteConfig;
  default?: RouteComponent | any;
  fallback?: RouteFallbackComponent | any;
  handler?: ClientRouteHandler | ClientRouteHandlers;
  meta?: Meta;
  render?: ClientRouteRender;
}

export type RouteConfig = Record<string, any>;

export type RouteComponentProps<
  Data = unknown,
  Params = Record<string, string>
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
  route: string;

  /** The URL of the request that resulted in this page being rendered. */
  url: URL;
};

export interface RouteComponent<
  Data = unknown,
  Params = Record<string, string>
> {
  (props: RouteComponentProps<Data, Params>): any;
}

export type RouteFallbackComponentProps =
  | {
      name: string;
      message: string;
      status: number;
      statusText: string;
    }
  | {
      name: string;
      message: string;
      stack?: string;
    };

export interface RouteFallbackComponent {
  (props: RouteFallbackComponentProps): any;
}

export type RouteError = Error | HttpError;

export type RouteHandlers<Data = unknown, State = Record<string, unknown>> =
  | ServerRouteHandlers<Data, State>
  | ClientRouteHandlers<Data, State>;

export type ServerRouteHandlers<
  Data = unknown,
  State = Record<string, unknown>
> = {
  [K in
    | "GET"
    | "HEAD"
    | "POST"
    | "PUT"
    | "DELETE"
    | "OPTIONS"
    | "PATCH"]?: ServerRouteHandler<Data, State>;
};

export type ClientRouteHandlers<
  Data = unknown,
  State = Record<string, unknown>
> = {
  [K in "GET"]?: ClientRouteHandler<Data, State>;
};

export type RouteHandler<Data = unknown, State = Record<string, unknown>> =
  | ServerRouteHandler<Data, State>
  | ClientRouteHandler<Data, State>;

export interface ServerRouteHandler<
  Data = unknown,
  State = Record<string, unknown>
> {
  (req: Request, ctx: ServerRouteHandlerContext<Data, State>):
    | ServerRouteHandlerResult
    | Promise<ServerRouteHandlerResult>;
}

export interface ClientRouteHandler<
  Data = unknown,
  State = Record<string, unknown>
> {
  (req: Request, ctx: ClientRouteHandlerContext<Data, State>):
    | ClientRouteHandlerResult
    | Promise<ClientRouteHandlerResult>;
}

export type RouteHandlerContext<
  Data = undefined,
  State = Record<string, unknown>
> =
  | ServerRouteHandlerContext<Data, State>
  | ClientRouteHandlerContext<Data, State>;

export interface ServerRouteHandlerContext<
  Data = undefined,
  State = Record<string, unknown>
> {
  error?: RouteError;
  meta: Meta;
  params: Record<string, string>;
  render(
    renderProps?: {
      data?: Data;
      error?: RouteError;
      meta?: Meta;
    },
    options?: ResponseInit
  ): ServerRouteHandlerResult | Promise<ServerRouteHandlerResult>;
  state: State;
}

export interface ClientRouteHandlerContext<
  Data = undefined,
  State = Record<string, unknown>
> {
  error?: RouteError;
  meta: Meta;
  params: Record<string, string>;
  render(
    renderProps?: {
      data?: Data;
      error?: RouteError;
      meta?: Meta;
    },
    options?: ResponseInit
  ): ClientRouteHandlerResult | Promise<ClientRouteHandlerResult>;
  state: State;
}

export type RouteRenderContext<Data = unknown> =
  | ServerRouteRenderContext<Data>
  | ClientRouteRenderContext<Data>;

export interface ServerRouteRenderContext<
  Data = unknown,
  Params = Record<string, string>
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
  route: string;

  /** The URL of the request that resulted in this page being rendered. */
  url: URL;
}

export interface ClientRouteRenderContext<
  Data = unknown,
  Params = Record<string, string>
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
  route: string;

  /** The URL of the request that resulted in this page being rendered. */
  url: URL;

  // ... Client only ...

  /** The target element for component rendering. */
  container: Element;

  /** The component resumes running on the client side. */
  recovering: boolean | "fallback";
}

export type RouteRenderResult =
  | ServerRouteRenderResult
  | ClientRouteRenderResult;

export type ServerRouteRenderResult = string | ReadableStream;

export type ClientRouteRenderResult = void | {
  mount?: () => void | Promise<void>;
  unmount?: () => void | Promise<void>;
  /**@experimental*/
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

export type RouteRender<Data = unknown> =
  | ServerRouteRender<Data>
  | ClientRouteRender<Data>;

export interface ServerRouteRender<Data = unknown> {
  (renderContext: RouteRenderContext<Data>): Promise<ServerRouteRenderResult>;
}

export interface ClientRouteRender<Data = unknown> {
  (renderContext: RouteRenderContext<Data>): Promise<ClientRouteRenderResult>;
}

// --- META: DESCRIPTOR ---
// export interface BaseDescriptor {
//   /** Gets or sets the baseline URL on which relative links are based. */
//   href?: string;
//   /** Sets or retrieves the window or frame at which to target content. */
//   target?: string;
// }

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

export interface StyleDescriptor {
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

export type Handlers<Data> = RouteHandlers<Data>;

export type Handler<Data> = RouteHandler<Data>;

export type ComponentProps<Data = unknown, Params = Record<string, string>> =
  | WidgetComponentProps<Data>
  | RouteComponentProps<Data, Params>;

export type Component<Data = unknown> =
  | WidgetComponent<Data>
  | RouteComponent<Data>;

export interface Meta {
  base?: string;
  description?: string;
  keywords?: string;
  lang?: string;
  link?: LinkDescriptor[];
  meta?: MetaDescriptor[];
  script?: ScriptDescriptor[];
  style?: StyleDescriptor[];
  title?: string;
}

export type Render<Data = unknown> = ServerRender<Data> | ClientRender<Data>;

export type ServerRender<Data = unknown> =
  | ServerWidgetRender<Data>
  | ServerRouteRender<Data>;

export type ClientRender<Data = unknown> =
  | ClientWidgetRender<Data>
  | ClientRouteRender<Data>;

export type HttpError = {
  name: string;
  message: string;
  status: number;
  statusText: string;
};
