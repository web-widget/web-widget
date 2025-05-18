import type { Component, App } from 'vue';

export * from './components';

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
