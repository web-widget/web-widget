export default () => ({
  async mount({ container, recovering }) {
    if (!recovering) {
      // csr
      container.innerHTML = `<button>hello world</button>`;
    }

    // hydrate
    container.querySelector('button').onclick = function () {
      alert(this.textContent);
    };
  },

  async unmount({ container }) {
    container.innerHTML = '';
  },
});
