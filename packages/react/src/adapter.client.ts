import { defineClientRender } from '@web-widget/helpers';
import type { FunctionComponent } from 'react';
import { createElement, StrictMode } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { reportRecoverableError } from './hydration-error';

export * from './components';

export const render = defineClientRender<FunctionComponent>(
  async (component, data, { key, recovering, container }) => {
    data = data ?? {};

    if (!component) {
      throw new TypeError(`Missing component.`);
    }

    if (!container) {
      throw new Error(`Missing container.`);
    }

    let root: Root | null;
    return {
      async mount() {
        const isAsyncFunction =
          Object.prototype.toString.call(component) ===
          '[object AsyncFunction]';
        let vNode = isAsyncFunction
          ? await component(data as any)
          : createElement(component as FunctionComponent, data as any);

        vNode = createElement(StrictMode, null, vNode);

        if (recovering) {
          root = hydrateRoot(container as Element, vNode as any, {
            identifierPrefix: key,
            onRecoverableError: (error) =>
              reportRecoverableError(container, error),
          });
        } else {
          root = createRoot(container, { identifierPrefix: key });
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
