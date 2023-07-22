export type Module =
  | WidgetModule<Record<string, any>>
  | RouteModule<Record<string, any>>;

// --- WIDGET ---

export interface WidgetModule<Data> {
  default?: WidgetComponent<Data> | any;
  meta?: WidgetMeta;
  render: WidgetRender<Data>;
}

export interface WidgetMeta {
  title?: string;
  description?: string;
  keywords?: string;
  lang?: string;
  /**
   * Used to manually append `<link>` elements to the `<head>`.
   */
  link?: LinkDescriptor[];
  /**
   * Used to manually append `<style>` elements to the `<head>`.
   */
  style?: StyleDescriptor[];
}

export type WidgetRenderContext<Data> =
  | ServerWidgetRenderContext<Data>
  | ChientWidgetRenderContext<Data>;

export interface ServerWidgetRenderContext<Data> {
  /**
   * Props of a component.
   */
  data: Data;

  /**
   * This is a component of the UI framework.
   */
  component?: WidgetComponent<Data> | any;
}

export interface ChientWidgetRenderContext<Data> {
  /**
   * Props of a component.
   */
  data: Data;

  /**
   * This is a component of the UI framework.
   */
  component?: WidgetComponent<Data> | any;

  /**
   * This is a render container element that exists only on the client side.
   */
  container: Element;

  /**
   * This is the flag for client hydration mode.
   */
  recovering: boolean;
}

export interface WidgetRender<Data> {
  (renderContext: WidgetRenderContext<Data>): Promise<RenderResult>;
}

export interface WidgetComponent<Data> {
  (data: Data): any;
}

// --- WIDGET: ERROR---

export interface WidgetErrorModule<Error> extends WidgetModule<null> {
  default?: ErrorWidgetComponent<Error> | any;
}

export interface WidgetErrorComponentProps<Error> {
  /** The error that caused the error page to be loaded. */
  error: Error;
}

export interface ErrorWidgetComponent<Error>
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
  params: Params;

  /**
   * Additional data passed into `HandlerContext.render`. Defaults to
   * `undefined`.
   */
  data: Data;
}

export interface RouteComponent<Data, Params = Record<string, string>>
  extends WidgetComponent<Data> {
  (routeProps: RouteComponentProps<Data, Params>): any;
}

export interface RouteHandlerContext<Data, State = Record<string, unknown>> {
  meta: RouteMeta;
  params: Record<string, string>;
  render: (
    userRenderContext: {
      data?: Data;
      meta?: RouteMeta;
    },
    options?: ResponseInit
  ) => Response | Promise<Response>;
  state: State;
}

export interface RouteHandler<Data, State = Record<string, unknown>> {
  (req: Request, ctx: RouteHandlerContext<Data, State>):
    | Response
    | Promise<Response>;
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

  /**
   * Used to manually set meta tags in the head. Additionally, the `data`
   * property could be used to set arbitrary data which the `<head>` component
   * could later use to generate `<meta>` tags.
   */
  meta?: MetaDescriptor[];
  /**
   * Used to manually append `<link>` elements to the `<head>`.
   */
  link?: LinkDescriptor[];
  /**
   * Used to manually append `<style>` elements to the `<head>`.
   */
  style?: StyleDescriptor[];
  /**
   * Used to manually append `<script>` elements to the `<head>`.
   */
  script?: ScriptDescriptor[];
}

export interface RouteRenderContext<Data, Params = Record<string, string>>
  extends WidgetRender<Data> {
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
  params: Params;

  /**
   * Additional data passed into `HandlerContext.render`. Defaults to
   * `undefined`.
   */
  data: Data;

  /**
   * Add tags such as meta to the page. Defaults to `[]`.
   */
  meta: RouteMeta;

  /**
   * This is a component of the UI framework.
   */
  component?: RouteComponent<Data, Params> | any;
}

export interface RouteRender<Data> extends WidgetRender<Data> {
  (renderContext: RouteRenderContext<Data>): Promise<RenderResult>;
}

// --- ROUTE: ERROR---

export interface RouteErrorModule<Error> extends RouteModule<null> {
  default?: ErrorRouteComponent<Error> | any;
  handler?: ErrorRouteHandler<Error>;
}

export interface RouteErrorComponentProps<Error>
  extends RouteComponentProps<null> {
  /** The error that caused the error page to be loaded. */
  error: Error;
}

export interface ErrorRouteComponent<Error>
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

// --- BASIC ---

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
  //  relList: DOMTokenList;
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

export type RenderResult = ServerRenderResult | ClientRenderResult;

export type ServerRenderResult = string | ReadableStream;

export type ClientRenderResult = void | {
  mount?: () => void | Promise<void>;
  /**@experimental*/
  update?: ({ data }: { data: Record<string, any> }) => void | Promise<void>;
  unmount?: () => void | Promise<void>;
};
