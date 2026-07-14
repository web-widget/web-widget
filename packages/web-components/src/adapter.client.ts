import { defineClientRender } from '@web-widget/helpers';
import { resolveTagName, type WebComponent } from './components';
export * from './components';

export const render = defineClientRender<WebComponent>(
  async (component, data, { container }) => {
    if (!component) throw new TypeError('Missing component.');
    if (!container) throw new Error('Missing container.');
    let element: HTMLElement | undefined;
    return {
      mount() {
        element = document.createElement(resolveTagName(component));
        Object.assign(element, data ?? {});
        container.replaceChildren(element);
      },
      unmount() {
        element?.remove();
        element = undefined;
      },
    };
  }
);
