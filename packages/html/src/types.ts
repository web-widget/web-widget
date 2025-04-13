import type {
  Component,
  ComponentProps,
  RenderContext,
  Serializable,
} from '@web-widget/helpers';

export * from './web-widget';

export interface DefineHtmlRenderOptions {
  /**@deprecated*/
  onPrefetchData?: (
    context: RenderContext,
    component: Component,
    props: ComponentProps
  ) => Promise<Serializable>;
}
