export default () => {
  let element;
  return {
    async bootstrap() {
      element = document.createElement('div');
      element.style = 'border: 1px solid #000; text-align: right';
      element.innerHTML = `<slot name="title"></slot>`;
    },

    async mount({ container }) {
      container.appendChild(element);
    },

    async unmount({ container }) {
      container.removeChild(element);
    },
  };
};
