import type {
  WidgetModule,
  Meta,
  SerializableValue,
} from '@web-widget/helpers';
export type * from '@web-widget/helpers';

export interface SerializableObject {
  [key: string]: SerializableValue;
}

export type Loader = () => Promise<WidgetModule>;

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
