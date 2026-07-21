import { defineServerRender } from '@web-widget/helpers';
export * from './components';
export const render = defineServerRender(async (component, _data, options) => {
  if (!component) throw new TypeError('Missing component.');
  if (options.progressive) {
    console.warn(
      'Web Components do not support server rendering in this adapter; progressive rendering was ignored.'
    );
  }
  return '';
});
