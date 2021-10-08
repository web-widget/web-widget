window.TEST_LIFECYCLE = 'load';

export default () => ({
  async bootstrap() {
    window.TEST_LIFECYCLE = 'bootstrap';
  },

  async mount({ container }) {
    window.TEST_LIFECYCLE = 'mount';
    container.innerHTML = `hello wrold`;
  },

  async unmount({ container }) {
    window.TEST_LIFECYCLE = 'unmount';
    container.removeChild = ``;
  }
});
