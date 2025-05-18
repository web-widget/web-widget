import type { Component, default as Vue } from 'vue';
import type { SerializableValue } from '@web-widget/helpers';

export * from './components';

interface SerializableObject {
  [key: string]: SerializableValue;
}

export interface CreateVueRenderOptions {
  onBeforeCreateApp?: (
    context: {
      container?: Element | DocumentFragment;
      data: any;
      progressive?: boolean;
      recovering?: boolean;
    },
    component: Component,
    props: any
  ) => Promise<any>;
  onCreatedApp?: (
    app: Vue,
    context: { data: any },
    component: Component,
    props: any
  ) => Promise<void>;
  /**@deprecated*/
  onPrefetchData?: (
    context: { data: any },
    component: Component,
    /**@deprecated*/
    props: any
  ) => Promise<SerializableObject>;
}
