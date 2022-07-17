export default () => ({
  async mount({ container, env }) {
    if (typeof env.hydrateonly === 'undefined') {
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
