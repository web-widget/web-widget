import type {
  ServerWidgetModule,
  ClientWidgetModule,
  Meta,
  SerializableValue,
} from '@web-widget/helpers';

/** Internal element name for the client-only pending boundary. */
export const WEB_WIDGET_PENDING_LOCAL_NAME = 'web-widget-pending';

export interface SerializableObject {
  [key: string]: SerializableValue;
}

export type Loader = () => Promise<ServerWidgetModule | ClientWidgetModule>;

export interface WebWidgetElementProps {
  base?: string;
  data?: SerializableObject;
  import?: string;
  inactive?: boolean;
  loading?: 'lazy' | 'eager' | 'idle';
  meta?: Meta;
  name?: string;
  // recovering?: boolean;
  renderTarget?: 'light' | 'shadow';
}

export interface WebWidgetRendererOptions extends WebWidgetElementProps {
  children?: string;
  renderStage?: 'server' | 'client';
}

export interface WebWidgetRendererInterface {
  localName: string;
  pendingLocalName: string;
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
