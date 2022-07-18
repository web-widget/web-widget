window.TestWidget2 = () => ({
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
