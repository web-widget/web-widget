import { defineClientRender } from '@web-widget/helpers';
import {
  h,
  hydrate,
  render as renderComponent,
  type ComponentType,
} from 'preact';
export type {
  PreactWidgetComponent,
  PreactWidgetContainerProps,
  PreactWidgetFactory,
  WidgetContainerOptions,
} from './components';
import { createWidgetAdapter } from './components';

export const widget = createWidgetAdapter();

export const render = defineClientRender<ComponentType<any>>(
  async (component, data, { container, recovering }) => {
    if (!component) throw new TypeError('Missing component.');
    if (!container) throw new Error('Missing container.');
    return {
      mount() {
        const vnode = h(component, data ?? {});
        recovering
          ? hydrate(vnode, container)
          : renderComponent(vnode, container);
      },
      unmount() {
        renderComponent(null, container);
      },
    };
  }
);
