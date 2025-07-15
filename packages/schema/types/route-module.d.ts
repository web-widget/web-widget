import { HTTPException, State, KnownMethods, FetchContext } from './http';
import { Meta } from './meta';
import { ServerRender, ServerRenderOptions } from './render';

export interface RouteModule {
  config?: RouteConfig;
  default?: RouteComponent;
  fallback?: RouteFallbackComponent;
  handler?: RouteHandler | RouteHandlers;
  meta?: Meta;
  render?: ServerRender;
}

export interface RouteConfig extends Record<string, unknown> {}

export interface RouteComponentProps<
  Data = unknown,
  Params = Record<string, string>,
> extends Omit<
    RouteContext<Data, Params>,
    'render' | 'html' | 'renderOptions' | 'renderer' | 'waitUntil' | 'module'
  > {}

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
   * Render current route with specific data and options.
   * @experimental
   */
  html(
    data?: Data,
    options?: {
      error?: HTTPException;
      meta?: Meta;
      renderer?: ServerRenderOptions;
    } & ResponseInit
  ): Response | Promise<Response>;

  /**
   * This is the default option for the `render()` method.
   */
  renderOptions: RouteRenderOptions;

  /**
   * This is the default option for the renderer.
   * @experimental
   */
  renderer: ServerRenderOptions;
}

export interface RouteRenderOptions extends ResponseInit, ServerRenderOptions {}
