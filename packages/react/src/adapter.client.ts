import { defineClientRender } from '@web-widget/helpers';
import type { FunctionComponent } from 'react';
import { createElement, StrictMode } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { reportRecoverableError } from './client/hydration-error';
import { createWidgetAdapter } from './widget/factory';

export { resolveFallback } from './widget/fallback';
export type * from './widget/types';

export const widget = createWidgetAdapter();

export const render = defineClientRender<FunctionComponent>(
  async (component, data, { id, recovering, container }) => {
    if (!component) {
      throw new TypeError(`Missing component.`);
    }

    if (!container) {
      throw new Error(`Missing container.`);
    }

    const props = data ?? {};
    let root: Root | null;
    return {
      async mount() {
        const isAsyncFunction =
          Object.prototype.toString.call(component) ===
          '[object AsyncFunction]';
        let vNode = isAsyncFunction
          ? await component(props as any)
          : createElement(component as FunctionComponent, props as any);

        vNode = createElement(StrictMode, null, vNode);

        if (recovering) {
          root = hydrateRoot(container as Element, vNode as any, {
            identifierPrefix: id,
            onRecoverableError: (error) =>
              reportRecoverableError(container, error),
          });
        } else {
          root = createRoot(container, { identifierPrefix: id });
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
