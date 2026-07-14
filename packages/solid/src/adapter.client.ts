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
        const canHydrate = recovering && Reflect.has(globalThis, '_$HY');
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
