import { defineClientRender } from '@web-widget/helpers';
import type { FunctionComponent } from 'react';
import { createElement, StrictMode } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot, hydrateRoot } from 'react-dom/client';

export * from '@web-widget/helpers';
export { useWidgetSyncState as useWidgetState } from '@web-widget/helpers/state';
export * from './components';

export const render = defineClientRender<FunctionComponent>(
  async (component, context, { recovering, container }) => {
    if (!component) {
      throw new TypeError(`Missing component.`);
    }

    if (!container) {
      throw new Error(`Missing container.`);
    }

    let root: Root | null;
    return {
      async mount() {
        let vNode;

        if (component.constructor.name === 'AsyncFunction') {
          // experimental
          vNode = await component(context as any);
        } else {
          vNode = createElement(component as FunctionComponent, context as any);
        }

        vNode = createElement(StrictMode, null, vNode);

        if (recovering) {
          root = hydrateRoot(container as Element, vNode as any);
        } else {
          root = createRoot(container);
          root.render(vNode as any);
        }
      },

      async unmount() {
        root?.unmount();
        root = null;
      },
    };
  }
);
