import { defineServerRender } from '@web-widget/helpers';
import { h, type ComponentType } from 'preact';
import { renderToStringAsync } from 'preact-render-to-string';
export * from './components';

export const render = defineServerRender<ComponentType<any>>(
  async (component, data) => {
    if (!component) throw new TypeError('Missing component.');
    return renderToStringAsync(h(component, data ?? {}));
  }
);
