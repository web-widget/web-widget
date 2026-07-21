import { defineServerRender } from '@web-widget/helpers';
export * from './components';
export const render = defineServerRender(async (component, _data, options) => {
  if (!component) throw new TypeError('Missing component.');
  if (options.progressive) {
    console.warn(
      'Lit does not support server rendering in this adapter; progressive rendering was ignored.'
    );
  }
  return '';
});
