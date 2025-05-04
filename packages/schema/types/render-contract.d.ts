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
  /** The component to be rendered (could be framework-specific). */
  component: Component;
  /** If true, enable progressive (streaming) rendering. */
  progressive?: boolean;
}

/**
 * The result type of a server renderer depending on the progressive flag.
 */
export type ServerRenderResult<Options extends ServerRenderOptions> =
  Options extends { progressive: true }
    ? ReadableStream<Uint8Array> // Or `ReadableStream<string>` depending on usage
    : string;

/**
 * A function that renders a component to HTML or stream on the server.
 */
export interface ServerRenderFunction<
  Data = unknown,
  Options extends ServerRenderOptions = ServerRenderOptions,
  Result = ServerRenderResult<Options>,
> {
  (data: Data, options?: Options): Result | Promise<Result>;
}

/**
 * The options required to render a component on the client side.
 */
export interface ClientRenderOptions<Component = unknown> {
  /** The component to be rendered (could be framework-specific). */
  component: Component;
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
 */
export interface ClientRenderFunction<
  Data = unknown,
  Options extends ClientRenderOptions = ClientRenderOptions,
  Result = void | ClientRenderResult,
> {
  (data: Data, options?: Options): Result | Promise<Result>;
}
