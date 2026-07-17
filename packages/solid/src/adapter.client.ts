import { defineClientRender } from '@web-widget/helpers';
import type { Component } from 'solid-js';
import { createComponent } from 'solid-js';
import { hydrate, render as renderComponent } from 'solid-js/web';
export * from './components';

export const render = defineClientRender<Component<any>>(
  async (component, data, { container, recovering }) => {
    if (!component) throw new TypeError('Missing component.');
    if (!container) throw new Error('Missing container.');
    let dispose: (() => void) | undefined;
    return {
      mount() {
        const view = () => createComponent(component, data ?? {});
        // Solid hydration uses the global _$HY registry and a renderId-based
        // key namespace. Isolated web-widget roots do not have their own
        // renderId yet, so hydrating them can collide with the page root.
        const isIsolatedWidget =
          recovering && container.getRootNode() instanceof ShadowRoot;
        const canHydrate =
          recovering && !isIsolatedWidget && Reflect.has(globalThis, '_$HY');
        if (canHydrate) {
          dispose = hydrate(view, container);
        } else {
          container.replaceChildren();
          dispose = renderComponent(view, container);
        }
      },
      unmount() {
        dispose?.();
        dispose = undefined;
      },
    };
  }
);
