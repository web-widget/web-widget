export default () => ({
  async mount({ container, parameters }) {
    if (typeof parameters.hydrateonly === 'undefined') {
      container.innerHTML = `<button>hello wrold</button>`;
    }

    container.querySelector('button').onclick = function () {
      alert(this.textContent);
    };
  },

  async unmount({ container }) {
    container.innerHTML = '';
  }
});
