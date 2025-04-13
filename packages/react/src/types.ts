import type { Component } from 'react';
import type {
  ComponentProps,
  RenderContext,
  Serializable,
} from '@web-widget/helpers';

export * from './components';

interface SerializableObject {
  [key: string]: Serializable;
}

export interface CreateReactRenderOptions {
  /**@deprecated*/
  onPrefetchData?: (
    context: RenderContext,
    component: Component,
    props: ComponentProps
  ) => Promise<SerializableObject>;
}
