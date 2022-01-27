export default () => ({
  async mount({ container }) {
    container.innerHTML = '404';
  },
  async unmount({ container }) {
    container.innerHTML = '';
  }
});
