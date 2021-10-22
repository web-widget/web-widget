/* eslint-disable no-undef */
System.register([], exports => ({
  execute() {
    exports('default', () => ({
      async mount({ context }) {
        setTimeout(() => {
          context.update({
            data: {
              lifecycle: 'mount'
            }
          });
        });
      }
    }));
  }
}));
