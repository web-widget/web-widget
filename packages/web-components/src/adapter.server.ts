import { defineServerRender } from '@web-widget/helpers';
export * from './components';
export const render = defineServerRender(async (_component, _data, options) => {
  if (options.progressive) {
    console.warn(
      'Web Components do not support server rendering in this adapter; progressive rendering was ignored.'
    );
  }
  return '';
});
