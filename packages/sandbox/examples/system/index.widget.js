System.register([], exports => ({
  execute() {
    exports('default', () => {
      let element;
      return {
        async bootstrap({ data }) {
          element = document.createElement('div');
          element.innerHTML = `hello wrold: ${JSON.stringify(data, null, 2)}`;
        },

        async mount({ container }) {
          container.appendChild(element);
        },

        async unmount({ container }) {
          container.removeChild(element);
        }
      };
    });
  }
}));
