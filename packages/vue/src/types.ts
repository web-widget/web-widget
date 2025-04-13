import type { Component, App } from 'vue';
import type {
  ComponentProps,
  RenderContext,
  Serializable,
} from '@web-widget/helpers';

export * from './components';

interface SerializableObject {
  [key: string]: Serializable;
}

export interface CreateVueRenderOptions {
  onCreatedApp?: (
    app: App<Element>,
    context: RenderContext,
    component: Component,
    props: ComponentProps
  ) => Promise<void>;
  /**@deprecated*/
  onPrefetchData?: (
    context: RenderContext,
    component: Component,
    props: ComponentProps
  ) => Promise<SerializableObject>;
}
