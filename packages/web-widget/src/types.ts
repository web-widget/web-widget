import type {
  ClientWidgetModule,
  Meta,
  SerializableObject,
  ServerWidgetModule,
  WidgetContainerOptions,
  WidgetHostProps,
  WidgetModuleLoader,
} from '@web-widget/schema';
import type { Timeouts } from './container';
import type { ResolvedWidgetStyle } from './style-descriptors';

export type { SerializableObject } from '@web-widget/schema';

export const WEB_WIDGET_PENDING_LOCAL_NAME = 'web-widget-pending';
export type Loader = WidgetModuleLoader<
  ServerWidgetModule | ClientWidgetModule
>;

export interface WebWidgetElementOptions extends Pick<
  WidgetContainerOptions,
  'loading' | 'root'
> {
  loader?: WidgetModuleLoader<ClientWidgetModule>;
  base?: string;
  contextData?: SerializableObject;
  data?: SerializableObject;
  id?: string;
  import?: string;
  inactive?: boolean;
  meta?: Meta;
  name?: string;
  recovering?: boolean;
  timeouts?: Timeouts;
}

export type WebWidgetElementProps = WebWidgetElementOptions;

export interface WebWidgetRendererOptions
  extends WidgetContainerOptions, WidgetHostProps {
  base?: string;
  children?: string;
  data?: SerializableObject;
  /** @internal Vite-transformed CSS descriptors used during development. */
  devStyles?: ResolvedWidgetStyle[];
  import?: string;
  id?: string;
  inactive?: boolean;
}

export interface WidgetRenderParts {
  appHTML: string;
  attributes: Record<string, string>;
  lightChildrenHTML: string;
  pendingHTML?: string;
  styles: ResolvedWidgetStyle[];
  target: 'light' | 'shadow';
  transferHTML: string;
}

export interface WebWidgetPendingBoundary {
  ariaBusy: true;
  display: 'contents';
  localName: string;
  slot: string;
}

export interface WebWidgetRenderOptions {
  pendingHTML?: string;
}

export interface WebWidgetRendererInterface {
  localName: string;
  pendingBoundary: WebWidgetPendingBoundary;
  attributes: Record<string, string>;
  renderInnerHTMLToString(): Promise<string>;
  renderOuterHTMLToString(options?: WebWidgetRenderOptions): Promise<string>;
}

export interface WebWidgetRendererConstructor {
  new (
    loader: WidgetModuleLoader<ServerWidgetModule | ClientWidgetModule>,
    options: WebWidgetRendererOptions
  ): WebWidgetRendererInterface;
}
