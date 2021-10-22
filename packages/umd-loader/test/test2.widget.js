window.TestWidget2 = () => ({
  async mount({ context }) {
    setTimeout(() => {
      context.update({
        data: {
          lifecycle: 'mount'
        }
      });
    });
  }
});
