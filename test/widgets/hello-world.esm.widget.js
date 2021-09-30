let element;
window.TEST_LIFECYCLE = 'load';

export default () => ({
  async bootstrap() {
    TEST_LIFECYCLE = 'bootstrap';
    element = document.createElement('div');
    element.innerHTML = `hello wrold`;
  },

  async mount({ container }) {
    TEST_LIFECYCLE = 'mount';
    container.appendChild(element);
  },

  async unmount({ container }) {
    TEST_LIFECYCLE = 'unmount';
    container.removeChild(element);
  }
});
