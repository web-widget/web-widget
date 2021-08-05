export default () => {
  let element;
  return {
    async bootstrap({ dataset }) {
      element = document.createElement('div');
      element.innerHTML = `hello wrold: ${JSON.stringify(dataset, null, 2)}`;
    },

    async mount({ container }) {
      container.appendChild(element);
    },

    async unmount({ container }) {
      container.removeChild(element);
    }
  };
};
