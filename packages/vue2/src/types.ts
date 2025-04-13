import type { Component, default as Vue } from 'vue';
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
  onBeforeCreateApp?: (
    context: RenderContext,
    component: Component,
    props: ComponentProps
  ) => Promise<any>;
  onCreatedApp?: (
    app: Vue,
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
