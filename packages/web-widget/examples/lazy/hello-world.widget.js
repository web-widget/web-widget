export default () => {
  let element;
  return {
    async bootstrap() {
      element = document.createElement("div");
      element.style = "background: green; color: white";
      element.innerHTML = `hello wrold`;
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, 900);
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
