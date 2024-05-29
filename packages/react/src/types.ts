import type { Component } from 'react';
import type {
  ComponentProps,
  RenderContext,
  SerializableValue,
} from '@web-widget/helpers';

export * from './components';

type SerializableObject = { [key: string]: SerializableValue };

export interface CreateReactRenderOptions {
  /**@deprecated*/
  onPrefetchData?: (
    context: RenderContext,
    component: Component,
    props: ComponentProps
  ) => Promise<SerializableObject>;
}
