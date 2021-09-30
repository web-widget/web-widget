let element;
window.TEST_UMD_LIFECYCLE = 'load';
var HelloWorld = () => ({
  async bootstrap() {
    TEST_UMD_LIFECYCLE = 'bootstrap';
    element = document.createElement('div');
    element.innerHTML = `hello wrold`;
  },

  async mount({ container }) {
    TEST_UMD_LIFECYCLE = 'mount';
    container.appendChild(element);
  },

  async unmount({ container }) {
    TEST_UMD_LIFECYCLE = 'unmount';
    container.removeChild(element);
  }
});
