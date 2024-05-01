import type {
  Component,
  ComponentProps,
  RenderContext,
} from '@web-widget/helpers';

export * from './web-widget';

type JSONValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONValue }
  | JSONValue[];

type JSONProps = { [key: string]: JSONValue };

export interface DefineHtmlRenderOptions {
  /**@deprecated*/
  onPrefetchData?: (
    context: RenderContext,
    component: Component,
    props: ComponentProps
  ) => Promise<JSONProps>;
}
