import { defineClientRender } from '@web-widget/helpers';
import { defineLitElement, type LitComponent } from './components';
export * from './components';

export const render = defineClientRender<LitComponent>(
  async (component, data, { container }) => {
    if (!component) throw new TypeError('Missing component.');
    if (!container) throw new Error('Missing container.');
    let element: InstanceType<LitComponent> | undefined;
    return {
      async mount() {
        element = document.createElement(
          defineLitElement(component)
        ) as InstanceType<LitComponent>;
        Object.assign(element, data ?? {});
        container.replaceChildren(element);
        await element.updateComplete;
      },
      unmount() {
        element?.remove();
        element = undefined;
      },
    };
  }
);
