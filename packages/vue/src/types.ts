import type { Component, App } from 'vue';
import type { SerializableValue } from '@web-widget/helpers';

export * from './components';

interface SerializableObject {
  [key: string]: SerializableValue;
}

export interface CreateVueRenderOptions {
  onCreatedApp?: (
    app: App<Element>,
    context: {
      container?: Element | DocumentFragment;
      data: any;
      progressive?: boolean;
      recovering?: boolean;
    },
    component: Component,
    props: any
  ) => Promise<void>;
}
