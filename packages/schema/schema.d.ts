export type SerializableValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: SerializableValue }
  | SerializableValue[];

export type KnownMethods =
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'OPTIONS'
  | 'PATCH';

export type FetchEventLike = Pick<
  FetchEvent,
  'request' | 'respondWith' | 'waitUntil'
>;

export interface FetchContext<Params = Record<string, string>>
  extends Omit<FetchEventLike, 'respondWith'> {
  /**
   * Errors in the current route.
   */
  error?: HTTPException;

  /**
   * The parameters that were matched from the route.
   *
   * For the `/foo/:bar` route with url `/foo/123`, `params` would be
   * `{ bar: '123' }`. For a route with no matchers, `params` would be `{}`. For
   * a wildcard route, like `/foo/:path*` with url `/foo/bar/baz`, `params` would
   * be `{ path: 'bar/baz' }`.
   */
  params: Readonly<Params>;

  /**
   * The state of the application, the content comes from the middleware.
   */
  readonly state: State;

  /** @deprecated */
  readonly name?: string;

  /**
   * The route matcher (e.g. /blog/:id) that the request matched for this page
   * to be rendered.
   * @deprecated
   */
  readonly pathname: string;
}

export interface HTTPException extends Error {
  expose?: boolean;
  status?: number;
  statusText?: string;
}

export interface State extends Record<string, unknown> {}

////////////////////////////////////////
//////                            //////
//////       Widget Modules       //////
//////                            //////
////////////////////////////////////////

export type WidgetModule = ServerWidgetModule | ClientWidgetModule;

export interface ServerWidgetModule {
  config?: WidgetConfig;
  default?: WidgetComponent;
  fallback?: WidgetFallbackComponent;
  meta?: Meta;
  render?: ServerWidgetRender;
}

export interface ClientWidgetModule {
  config?: WidgetConfig;
  default?: WidgetComponent;
  fallback?: WidgetFallbackComponent;
  meta?: Meta;
  render?: ClientWidgetRender;
}

export interface WidgetConfig extends Record<string, unknown> {}

export type WidgetComponentProps<Data = unknown> = Data;

export type WidgetComponent<Data = unknown> = (
  props: WidgetComponentProps<Data>
) => any;

export interface WidgetFallbackComponentProps {
  name: string;
  message: string;
  stack?: string;
}

export type WidgetFallbackComponent = (
  props: WidgetFallbackComponentProps
) => any;

export type WidgetError = Error;

export type WidgetRenderContext<Data = unknown> =
  | ServerWidgetRenderContext<Data>
  | ClientWidgetRenderContext<Data>;

export interface ServerWidgetRenderContext<Data = unknown> {
  data: Data;
  readonly children?: ServerWidgetRenderResult;
  error?: WidgetError;
  meta: Meta;
  module: Readonly<ServerWidgetModule>;
}

export interface ClientWidgetRenderContext<Data = unknown> {
  data: Data;
  readonly children?: ClientWidgetRenderResult;
  error?: WidgetError;
  meta: Meta;
  module: Readonly<ClientWidgetModule>;
  /** The target element for component rendering. */
  readonly container: Element | DocumentFragment;
  /** The component resumes running on the client side. */
  readonly recovering: boolean;
}

export type WidgetRenderResult =
  | ServerWidgetRenderResult
  | ClientWidgetRenderResult;

export type ServerWidgetRenderResult = string | ReadableStream;

export type ClientWidgetRenderResult = void | {
  bootstrap?: () => void | Promise<void>;
  mount?: () => void | Promise<void>;
  /** @experimental */
  update?: ({ data }: { data: Record<string, any> }) => void | Promise<void>;
  unmount?: () => void | Promise<void>;
  unload?: () => void | Promise<void>;
};

export interface WidgetRenderOptions extends Record<string, unknown> {}

export type WidgetRender<Data = unknown> =
  | ServerWidgetRender<Data>
  | ClientWidgetRender<Data>;

export interface ServerWidgetRender<Data = unknown> {
  (
    renderContext: ServerWidgetRenderContext<Data>,
    renderOptions?: WidgetRenderOptions
  ): ServerWidgetRenderResult | Promise<ServerWidgetRenderResult>;
}

export interface ClientWidgetRender<Data = unknown> {
  (
    renderContext: ClientWidgetRenderContext<Data>,
    renderOptions?: WidgetRenderOptions
  ): ClientWidgetRenderResult | Promise<ClientWidgetRenderResult>;
}

////////////////////////////////////////
//////                            //////
//////        Route Modules       //////
//////                            //////
////////////////////////////////////////

export interface RouteModule {
  config?: RouteConfig;
  default?: RouteComponent;
  fallback?: RouteFallbackComponent;
  handler?: RouteHandler | RouteHandlers;
  meta?: Meta;
  render?: RouteRender;
}

export interface RouteConfig extends Record<string, unknown> {}

export interface RouteComponentProps<
  Data = unknown,
  Params = Record<string, string>,
> extends RouteRenderContext<Data, Params> {}

export type RouteComponent<Data = unknown, Params = Record<string, string>> = (
  props: RouteComponentProps<Data, Params>
) => any;

export type RouteFallbackComponentProps = HTTPException;

export type RouteFallbackComponent = (
  props: RouteFallbackComponentProps
) => any;

/** @deprecated Use HTTPException instead. */
export type RouteError = HTTPException;

/** @deprecated Use State instead. */
export type RouteState = State;

export type RouteHandlers<Data = unknown, Params = Record<string, string>> = {
  [K in KnownMethods]?: RouteHandler<Data, Params>;
};

export interface RouteHandler<Data = unknown, Params = Record<string, string>> {
  (context: RouteContext<Data, Params>): Response | Promise<Response>;
}

export interface RouteContext<Data = unknown, Params = Record<string, string>>
  extends FetchContext<Params> {
  /**
   * This is the default data given to the `render()` method.
   */
  data: Data;

  /**
   * This is the default meta given to the `render()` method.
   */
  meta: Meta;

  /**
   * JavaScript module that handles the current route.
   */
  module: Readonly<RouteModule>;

  /**
   * Render current route.
   */
  render(
    renderProps?: {
      data?: Data;
      error?: HTTPException;
      meta?: Meta;
    },
    renderOptions?: RouteRenderOptions
  ): Response | Promise<Response>;

  /**
   * This is the default option for the `render()` method.
   */
  renderOptions: RouteRenderOptions;
}

export interface RouteRenderContext<
  Data = unknown,
  Params = Record<string, string>,
> extends Omit<RouteContext<Data, Params>, 'render' | 'renderOptions'> {}

export interface RouteRenderOptions
  extends Record<string, unknown>,
    ResponseInit {}

export type RouteRenderResult = string | ReadableStream;

export interface RouteRender<Data = unknown, Params = Record<string, string>> {
  (
    renderContext: RouteRenderContext<Data, Params>,
    renderOptions?: RouteRenderOptions
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
  [K in KnownMethods]?: MiddlewareHandler;
};

export type MiddlewareContext = FetchContext & Partial<RouteContext>;

export interface MiddlewareNext {
  (): MiddlewareResult | Promise<MiddlewareResult>;
}

export type MiddlewareResult = Response;

////////////////////////////////////////
//////                            //////
//////       Action Modules       //////
//////                            //////
////////////////////////////////////////

export interface ActionModule {
  [method: string]: ActionHandler;
}

export interface ActionHandler<
  A extends SerializableValue = SerializableValue,
  T extends SerializableValue = SerializableValue,
> {
  (...args: A[]): Promise<T>;
}

////////////////////////////////////////
//////                            //////
//////            Meta            //////
//////                            //////
////////////////////////////////////////

export interface Meta {
  /** The base URL of the document. */
  base?: BaseDescriptor;

  /** Description of the document. */
  description?: string;

  /** Document Keywords. */
  keywords?: string;

  /** Document language. */
  lang?: string;

  /** Document links. */
  link?: LinkDescriptor[];

  /** Document metadata. */
  meta?: MetaDescriptor[];

  /** Document scripts. */
  script?: ScriptDescriptor[];

  /** Document styles. */
  style?: StyleDescriptor[];

  /** Document title. */
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
  fetchpriority?: 'high' | 'low' | 'auto';

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
  'http-equiv'?: string;

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
  fetchpriority?: 'high' | 'low' | 'auto';

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

export type ServerModule =
  | ServerWidgetModule
  | ActionModule
  | RouteModule
  | MiddlewareModule;

export type ClientModule = ClientWidgetModule | RouteModule;

export type Handlers<Data = unknown, Params = Record<string, string>> =
  | RouteHandlers<Data, Params>
  | MiddlewareHandlers;

export type Handler<Data = unknown, Params = Record<string, string>> =
  | RouteHandler<Data, Params>
  | MiddlewareHandler;

export type ComponentProps<Data = unknown, Params = Record<string, string>> =
  | WidgetComponentProps<Data>
  | RouteComponentProps<Data, Params>;

export type Component<Data = unknown, Params = Record<string, string>> =
  | WidgetComponent<Data>
  | RouteComponent<Data, Params>;

export type RenderContext<Data = unknown, Params = Record<string, string>> =
  | RouteRenderContext<Data, Params>
  | WidgetRenderContext<Data>;

export type Render<Data = unknown, Params = Record<string, string>> =
  | ServerRender<Data, Params>
  | ClientRender<Data, Params>;

export type ServerRender<Data = unknown, Params = Record<string, string>> =
  | ServerWidgetRender<Data>
  | RouteRender<Data, Params>;

export type ClientRender<Data = unknown, Params = Record<string, string>> =
  | ClientWidgetRender<Data>
  | RouteRender<Data, Params>;
