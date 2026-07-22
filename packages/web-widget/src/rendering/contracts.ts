import type {
  ClientWidgetModule,
  Meta,
  SerializableObject,
  ServerWidgetModule,
  WidgetContainerOptions,
  WidgetHostProps,
  WidgetModuleLoader,
} from '@web-widget/schema';
import type { Timeouts } from '../lifecycle/runtime';
import type { ResolvedWidgetStyle } from '../shadow/style-descriptors';

export type { SerializableObject } from '@web-widget/schema';
export { WEB_WIDGET_PENDING_SLOT_NAME } from '../shared/constants';
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
  clientOnly?: boolean;
  data?: SerializableObject;
  /** @internal Vite-transformed CSS descriptors used during development. */
  devStyles?: ResolvedWidgetStyle[];
  import?: string;
  id?: string;
  inactive?: boolean;
  serverOnly?: boolean;
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
  localName: 'div';
  slot: string;
}

export interface WebWidgetRenderOptions {
  children?: string;
}

export interface WebWidgetOuterRenderOptions extends WebWidgetRenderOptions {
  pendingHTML?: string;
}

export interface WebWidgetRendererInterface {
  localName: string;
  pendingBoundary: WebWidgetPendingBoundary;
  attributes: Record<string, string>;
  /** Synchronous content used when a parent framework must preserve SSR DOM. */
  opaqueInnerHTML?: string;
  renderInnerHTMLToString(options?: WebWidgetRenderOptions): Promise<string>;
  renderOuterHTMLToString(
    options?: WebWidgetOuterRenderOptions
  ): Promise<string>;
}

export interface WebWidgetRendererConstructor {
  new (
    loader: WidgetModuleLoader<ServerWidgetModule | ClientWidgetModule>,
    options: WebWidgetRendererOptions
  ): WebWidgetRendererInterface;
}
