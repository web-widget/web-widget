window.TestWidget = () => ({
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
