export default () => {
  let element;
  return {
    async bootstrap() {
      element = document.createElement("span");
      element.innerHTML = `hello wrold`;
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, 500);
      });
    },

    async mount({ container }) {
      container.appendChild(element);
    },

    async unmount({ container }) {
      container.removeChild(element);
    },
  };
};
