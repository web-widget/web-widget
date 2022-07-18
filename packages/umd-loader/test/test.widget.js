window.TestWidget = () => ({
  async mount({ container, test }) {
    test();
    setTimeout(() => {
      container.update({
        data: {
          lifecycle: 'mount'
        }
      });
    });
  }
});
