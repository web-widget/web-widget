/**
 * Rendering type definitions.
 *
 * This module defines the types for both server-side and client-side
 * rendering, including render functions, options, and lifecycle hooks.
 * These types provide the foundation for the rendering system,
 * supporting SSR, CSR, and hydration scenarios.
 *
 * @module Rendering Types
 */

/**
 * The options required to render a component on the server side.
 * These options control how the server-side rendering process works.
 */
export interface ServerRenderOptions {
  /** If true, enable progressive (streaming) rendering. */
  progressive?: boolean;
}

/**
 * The result of a server-side render operation.
 * Can be either a string (complete HTML) or a stream (progressive rendering).
 */
export type ServerRenderResult = ReadableStream<string> | string;

/**
 * A function that renders a component to HTML or stream on the server.
 * This is the core interface for server-side rendering in the framework.
 * @param component The component to be rendered.
 * @param data The data to be passed to the component.
 * @param options The options for rendering.
 * @returns The rendered result, either as a string or a stream.
 */
export interface ServerRender<
  Component = unknown,
  Data = unknown,
  Options extends ServerRenderOptions = ServerRenderOptions,
  Result = ServerRenderResult,
> {
  (
    component: Component,
    data: Data,
    options: Options
  ): Result | Promise<Result>;
}

/**
 * The options required to render a component on the client side.
 * These options control how the client-side rendering process works.
 */
export interface ClientRenderOptions {
  /** The target DOM element or fragment where the component will be mounted. */
  container: Element | DocumentFragment;
  /** Indicates whether hydration should be used (i.e., recovering from SSR). */
  recovering?: boolean;
}

/**
 * Lifecycle hooks returned by a client-side renderer.
 * These hooks allow for fine-grained control over the component lifecycle.
 */
export type ClientRenderResult<Data = unknown> = {
  /** Prepare any required state before mount. */
  bootstrap?: () => void | Promise<void>;
  /** Mount the component into the DOM. */
  mount?: () => void | Promise<void>;
  /** Update the component with new data. */
  update?: (data: Data) => void | Promise<void>;
  /** Unmount the component from the DOM. */
  unmount?: () => void | Promise<void>;
  /** Clean up resources after unmount. */
  unload?: () => void | Promise<void>;
};

/**
 * A function that renders a component on the client (CSR or hydration).
 * This is the core interface for client-side rendering in the framework.
 * @param component The component to be rendered.
 * @param data The data to be passed to the component.
 * @param options The options for rendering.
 * @returns The rendered result, either as a string or a set of lifecycle hooks.
 */
export interface ClientRender<
  Component = unknown,
  Data = unknown,
  Options extends ClientRenderOptions = ClientRenderOptions,
  Result = void | ClientRenderResult<Data>,
> {
  (
    component: Component,
    data: Data,
    options: Options
  ): Result | Promise<Result>;
}
