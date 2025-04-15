import { Meta } from './common';

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

export type ServerWidgetRenderResult = string;

export type ClientWidgetRenderResult = void | {
  bootstrap?: () => void | Promise<void>;
  mount?: () => void | Promise<void>;
  /** @experimental */
  update?: ({ data }: { data: Record<string, any> }) => void | Promise<void>;
  unmount?: () => void | Promise<void>;
  unload?: () => void | Promise<void>;
};

export interface WidgetRenderOptions {}

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
