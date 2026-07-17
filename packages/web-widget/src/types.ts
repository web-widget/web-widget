import type {
  ClientWidgetModule,
  ServerWidgetModule,
  SerializableObject,
  WidgetContainerOptions,
  WidgetModuleLoader,
} from '@web-widget/schema';
import type { Timeouts } from './container';

export const WEB_WIDGET_PENDING_LOCAL_NAME = 'web-widget-pending';
export type Loader = WidgetModuleLoader<ServerWidgetModule | ClientWidgetModule>;

/** Internal element name for the client-only pending boundary. */
export interface WebWidgetElementOptions extends Pick<WidgetContainerOptions, 'loading' | 'renderTarget'> {
  loader?: WidgetModuleLoader<ClientWidgetModule>;
  base?: string;
  contextData?: SerializableObject;
  import?: string;
  inactive?: boolean;
  recovering?: boolean;
  timeouts?: Timeouts;
}
export type WebWidgetElementProps = WebWidgetElementOptions;

export interface WebWidgetRendererOptions extends WidgetContainerOptions {
  base?: string;
  children?: string;
  data?: SerializableObject;
  devStyles?: unknown[];
  import?: string;
  inactive?: boolean;
}

export interface WebWidgetRendererInterface {
  localName: string;
  pendingBoundary: { ariaBusy: true; display: 'contents'; slot: string };
  attributes: Record<string, string>;
  renderInnerHTMLToString(): Promise<string>;
  renderOuterHTMLToString(): Promise<string>;
}

export interface WebWidgetRendererConstructor {
  new (
    loader: Loader,
    options: WebWidgetRendererOptions
  ): WebWidgetRendererInterface;
}
