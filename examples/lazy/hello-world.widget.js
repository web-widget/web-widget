define(() => {
  let element;
  return {
    async bootstrap() {
      element = document.createElement('div');
      element.innerHTML = `hello wrold`;
      return new Promise(resolve => {
        setTimeout(() => {
          resolve();
        }, 1000);
      });
    },

    async mount({ container }) {
      container.appendChild(element);
    },

    async unmount({ container }) {
      container.removeChild(element);
    }
  };
});
