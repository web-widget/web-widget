window.TestWidget = () => ({
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
