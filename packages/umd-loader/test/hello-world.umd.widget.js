window.TEST_UMD_LIFECYCLE = 'load';
window.HelloWorld = () => ({
  async bootstrap() {
    window.TEST_UMD_LIFECYCLE = 'bootstrap';
  },

  async mount({ container }) {
    window.TEST_UMD_LIFECYCLE = 'mount';
    container.innerHTML = `hello wrold`;
  },

  async unmount({ container }) {
    window.TEST_UMD_LIFECYCLE = 'unmount';
    container.innerHTML = ``;
  }
});
