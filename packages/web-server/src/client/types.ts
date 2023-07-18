type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

export type WidgetRenderContext<Data = JSONValue> = {
  /**
   * Props of a component.
   */
  data: Data;

  /**
   * The error that caused the error page to be loaded.
   */
  error: unknown;

  /**
   * This is a component of the UI framework.
   */
  component?: any;

  /**
   * This is a render container element that exists only on the client side.
   */
  container: Element;

  /**
   * This is the flag for client hydration mode.
   */
  recovering: boolean;

  /**
   * <Experimental> This is the way to update the Props of a component.
   */
  update?: ({ data }: { data: JSONValue }) => Promise<void>;
};

export type RenderContext<Data> = WidgetRenderContext<Data>;

export type Render<Data = unknown> = (
  renderContext: RenderContext<Data>
) => Promise<RenderResult>;

export type RenderResult = void | {
  bootstrap?: () => void | Promise<void>;
  mount?: () => void | Promise<void>;
  // <Experimental>
  update?: ({ data }: { data: any }) => void | Promise<void>;
  unmount?: () => void | Promise<void>;
  unload?: () => void | Promise<void>;
};
