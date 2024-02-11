import { defineRender } from '@web-widget/helpers';
window.TEST_LIFECYCLE = 'load';

export const render = defineRender(({ container }) => ({
  async bootstrap() {
    window.TEST_LIFECYCLE = 'bootstrap';
  },

  async mount() {
    window.TEST_LIFECYCLE = 'mount';
    // eslint-disable-next-line no-param-reassign
    container.innerHTML = `hello world`;
  },

  async unmount() {
    window.TEST_LIFECYCLE = 'unmount';
    // eslint-disable-next-line no-param-reassign
    container.removeChild = ``;
  },
}));
