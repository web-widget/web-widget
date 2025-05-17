import { defineClientRender } from '@web-widget/helpers';

export const render = defineClientRender((component, data, { container }) => {
  let element;
  return {
    async bootstrap() {
      element = component(data);
    },

    async mount() {
      container.appendChild(element);
    },

    async unmount() {
      container.removeChild(element);
    },
  };
});

export default (data) =>
  Object.assign(document.createElement('code'), {
    innerHTML: `<pre>${JSON.stringify(data, null, 2)}</pre>`,
  });
