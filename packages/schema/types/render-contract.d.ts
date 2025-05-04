export interface ServerRenderModule {
  render: ServerRenderFunction;
}

export interface ClientRenderModule {
  render: ClientRenderFunction;
}

/**
 * The options required to render a component on the server side.
 */
export interface ServerRenderOptions<Component = unknown> {
  /** If true, enable progressive (streaming) rendering. */
  progressive?: boolean;
}

/**
 * The result type of a server renderer depending on the progressive flag.
 */
export type ServerRenderResult<Options extends ServerRenderOptions> =
  Options extends { progressive: true } ? ReadableStream<string> : string;

/**
 * A function that renders a component to HTML or stream on the server.
 * @param component The component to be rendered.
 * @param data The data to be passed to the component.
 * @param options The options for rendering.
 * @returns The rendered result, either as a string or a stream.
 */
export interface ServerRenderFunction<
  Component = unknown,
  Data = unknown,
  Options extends ServerRenderOptions = ServerRenderOptions,
  Result = ServerRenderResult<Options>,
> {
  (
    component: Component,
    data: Data,
    options?: Options
  ): Result | Promise<Result>;
}

/**
 * The options required to render a component on the client side.
 */
export interface ClientRenderOptions<Component = unknown> {
  /** The target DOM element or fragment where the component will be mounted. */
  container: Element | DocumentFragment;
  /** Indicates whether hydration should be used (i.e., recovering from SSR). */
  recovering?: boolean;
}

/**
 * Lifecycle hooks returned by a client-side renderer.
 */
export interface ClientRenderResult {
  /** Prepare any required state before mount. */
  bootstrap?: () => void | Promise<void>;
  /** Mount the component into the DOM. */
  mount?: () => void | Promise<void>;
  /** Update the component with new data. */
  update?: (data: Record<string, any>) => void | Promise<void>;
  /** Unmount the component from the DOM. */
  unmount?: () => void | Promise<void>;
  /** Clean up resources after unmount. */
  unload?: () => void | Promise<void>;
}

/**
 * A function that renders a component on the client (CSR or hydration).
 * @param component The component to be rendered.
 * @param data The data to be passed to the component.
 * @param options The options for rendering.
 * @returns The rendered result, either as a string or a set of lifecycle hooks.
 */
export interface ClientRenderFunction<
  Component = unknown,
  Data = unknown,
  Options extends ClientRenderOptions = ClientRenderOptions,
  Result = void | ClientRenderResult,
> {
  (
    component: Component,
    data: Data,
    options?: Options
  ): Result | Promise<Result>;
}
