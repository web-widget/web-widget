import type { Component, App } from 'vue';
import type { ComponentProps, RenderContext } from '@web-widget/helpers';

export * from './components';

type JSONValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONValue }
  | JSONValue[];

type JSONProps = { [key: string]: JSONValue };

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
  ) => Promise<JSONProps>;
}
