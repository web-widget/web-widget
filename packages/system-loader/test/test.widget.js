/* eslint-disable no-undef */

System.register([], exports => ({
  execute() {
    exports('default', () => ({
      async mount({ container, test }) {
        test();
        setTimeout(() => {
          container.update({
            data: {
              lifecycle: 'mount'
            }
          });
        }, 50);
      }
    }));
  }
}));
