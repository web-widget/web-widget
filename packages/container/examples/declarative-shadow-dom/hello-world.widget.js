export default () => ({
  async mount({ container }) {
    container.innerHTML = `<h2>hello wrold</h2>`;
  },

  async unmount({ container }) {
    container.innerHTML = '';
  }
});
