window.TestWidget2 = () => ({
  async mount({ container }) {
    setTimeout(() => {
      container.update({
        data: {
          lifecycle: 'mount'
        }
      });
    });
  }
});
