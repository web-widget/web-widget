define(() => {
  let element;
  return {
    async bootstrap() {
      element = document.createElement('div');
      element.innerHTML = `hello wrold`;
    },

    async mount({ container }) {
      return new Promise(resolve => {
        setTimeout(() => {
          container.appendChild(element);
          resolve();
        }, 500);
      });
    },

    async unmount({ container }) {
      container.removeChild(element);
    }
  };
});
