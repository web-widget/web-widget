/* eslint-disable no-undef */

System.register([], exports => ({
  execute() {
    exports('default', () => ({
      async mount({ container }) {
        setTimeout(() => {
          container.update({
            data: {
              lifecycle: 'mount'
            }
          });
        });
      }
    }));
  }
}));
