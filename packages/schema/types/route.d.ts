/**
 * Route module type definitions.
 *
 * This module defines the core types for route handling, including
 * route modules, components, handlers, and context objects. Routes
 * are the primary way to handle HTTP requests and define application
 * endpoints with their associated logic and rendering.
 *
 * @module Route Module Types
 */

import { HTTPException, State, KnownMethods, FetchContext } from './http';
import { Meta } from './meta';
import { ServerRender, ServerRenderOptions } from './render';

/**
 * Represents a route module that defines how a specific route should be handled.
 * Route modules can contain components, handlers, metadata, and rendering logic.
 */
export interface RouteModule {
  /** Configuration options for the route. */
  config?: RouteConfig;
  /** The default component to render for this route. */
  default?: RouteComponent;
  /** The fallback component to render when an error occurs. */
  fallback?: RouteFallbackComponent;
  /** HTTP method handlers for this route. */
  handler?: RouteHandler | RouteHandlers;
  /** Metadata for the route, including HTML head elements. */
  meta?: Meta;
  /** Server-side render function for the route. */
  render?: ServerRender;
}

/**
 * Configuration object for route-specific settings.
 * Can contain any additional configuration needed for the route.
 */
export interface RouteConfig extends Record<string, unknown> {}

/**
 * Props passed to route components.
 * Extends the route context but excludes internal rendering properties.
 */
export interface RouteComponentProps<
  Data = unknown,
  Params = Record<string, string>,
> extends Pick<
    RouteContext<Data, Params>,
    | 'data'
    | 'error'
    | 'meta'
    /** @deprecated */
    | 'name'
    | 'params'
    /** @deprecated */
    | 'pathname'
    | 'request'
    | 'state'
  > {}

/**
 * Represents a route component function.
 * Route components receive props and return the rendered content.
 */
export type RouteComponent<Data = unknown, Params = Record<string, string>> = (
  props: RouteComponentProps<Data, Params>
) => any;

/**
 * Props passed to fallback components when an error occurs.
 */
export type RouteFallbackComponentProps = HTTPException;

/**
 * Represents a fallback component function.
 * Fallback components are rendered when an error occurs in the route.
 */
export type RouteFallbackComponent = (
  props: RouteFallbackComponentProps
) => any;

/**
 * @deprecated Use HTTPException instead.
 * Legacy type for route errors.
 */
export type RouteError = HTTPException;

/**
 * @deprecated Use State instead.
 * Legacy type for route state.
 */
export type RouteState = State;

/**
 * Represents handlers for different HTTP methods on a route.
 * Each HTTP method can have its own handler function.
 */
export type RouteHandlers<Data = unknown, Params = Record<string, string>> = {
  [K in KnownMethods]?: RouteHandler<Data, Params>;
};

/**
 * Represents a route handler function for a specific HTTP method.
 * Route handlers receive the context and return a Response.
 */
export interface RouteHandler<Data = unknown, Params = Record<string, string>> {
  /**
   * Handles the HTTP request for this route.
   * @param context - The route context containing request information and utilities.
   * @returns A promise that resolves to a Response or the Response itself.
   */
  (context: RouteContext<Data, Params>): Response | Promise<Response>;
}

/**
 * The context object passed to route handlers and components.
 * Contains all the information and utilities needed to handle a route request.
 */
export interface RouteContext<Data = unknown, Params = Record<string, string>>
  extends FetchContext<Params> {
  /**
   * This is the default data given to the `html()` method.
   * Contains the data that will be passed to the route component.
   */
  data: Data;

  /**
   * This is the default meta given to the `html()` method.
   * Contains metadata for the route, including HTML head elements.
   */
  meta: Meta;

  /**
   * JavaScript module that handles the current route.
   * Contains the route module definition with all its exports.
   */
  module: Readonly<RouteModule>;

  /**
   * Render current route.
   * @deprecated Use html() instead.
   * @param renderProps - Optional data, error, and meta overrides for rendering.
   * @param renderOptions - Optional rendering options. @default current context's renderOptions
   * @returns A promise that resolves to a Response or the Response itself.
   */
  render(
    renderProps?: {
      /**
       * Error to be passed to the component during rendering.
       * @default current context's error value
       */
      error?: HTTPException;
      /**
       * Data to be passed to the component during rendering.
       */
      data?: Data;
      /**
       * Metadata for the route, including HTML head elements.
       * @default current context's meta value
       */
      meta?: Meta;
    },
    renderOptions?: RouteRenderOptions
  ): Response | Promise<Response>;

  /**
   * Render current route with specific data and options.
   * This method provides more direct control over the rendering process.
   * @param data - The data to pass to the component.
   * @param options - Rendering options including error, meta, and renderer settings.
   * @returns A promise that resolves to a Response or the Response itself.
   */
  html(
    data?: Data,
    options?: {
      /**
       * Error to be passed to the component during rendering.
       * @default current context's error value
       */
      error?: HTTPException;
      /**
       * Metadata for the route, including HTML head elements.
       * @default current context's meta value
       */
      meta?: Meta;
      /**
       * Server-side rendering options for this specific render call.
       * @default current context's renderer settings
       */
      renderer?: ServerRenderOptions;
    } & ResponseInit
  ): Response | Promise<Response>;

  /**
   * This is the default option for the `render()` method.
   * Contains the default rendering options for this route.
   * @deprecated Use renderer instead.
   */
  renderOptions: RouteRenderOptions;

  /**
   * This is the default option for the renderer.
   * Contains the default server render options for this route.
   */
  renderer: ServerRenderOptions;
}

/**
 * Options for route rendering, extending both ResponseInit and ServerRenderOptions.
 * Combines HTTP response options with server rendering options.
 * @deprecated Use ServerRenderOptions instead.
 */
export interface RouteRenderOptions extends ResponseInit, ServerRenderOptions {}
