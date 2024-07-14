import type { Component, App } from 'vue';
import type {
  ComponentProps,
  RenderContext,
  SerializableValue,
} from '@web-widget/helpers';

export * from './components';

interface SerializableObject {
  [key: string]: SerializableValue;
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
