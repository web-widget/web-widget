import { defineRender, getComponentDescriptor } from '@web-widget/helpers';
import type {
  ClientWidgetRenderContext,
  ComponentProps,
} from '@web-widget/helpers';
import type { FunctionComponent } from 'react';
import { createElement, StrictMode } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot, hydrateRoot } from 'react-dom/client';
import type { CreateReactRenderOptions } from './types';

export * from '@web-widget/helpers';
export { useWidgetSyncState as useWidgetState } from '@web-widget/helpers/context';
export * from './components';

export const createReactRender = ({
  onPrefetchData,
}: CreateReactRenderOptions = {}) => {
  if (onPrefetchData) {
    throw new Error(`"onPrefetchData" is not supported.`);
  }

  return defineRender(async (context) => {
    const { recovering, container } = context as ClientWidgetRenderContext;
    const componentDescriptor = getComponentDescriptor(context);
    const { component, props } = componentDescriptor;

    if (!container) {
      throw new Error(`Container required.`);
    }

    let root: Root | null;
    return {
      async mount() {
        let vNode;
        if (
          typeof component === 'function' &&
          component.constructor.name === 'AsyncFunction'
        ) {
          // experimental
          vNode = await component(props as ComponentProps<any>);
        } else {
          vNode = createElement(
            component as FunctionComponent,
            props as ComponentProps<any>
          );
        }

        vNode = createElement(StrictMode, null, vNode);

        if (recovering) {
          root = hydrateRoot(container as Element, vNode);
        } else {
          root = createRoot(container);
          root.render(vNode);
        }
      },

      async unmount() {
        root?.unmount();
        root = null;
      },
    };
  });
};

/**@deprecated Please use `createReactRender` instead.*/
export const defineReactRender = createReactRender;

export const render = createReactRender();
