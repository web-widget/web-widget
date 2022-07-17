export default () => ({
  async mount({ container, data, env }) {
    container.innerHTML = data
      .map(
        name =>
          `<div class="tabpanel" data-name="${name}" ${
            env.activity === name ? '' : 'hidden'
          }><slot name="${name}"></slot></div>`
      )
      .join('');
  },

  async update({ container, env }) {
    container.querySelectorAll(`.tabpanel`).forEach(element => {
      element.hidden = env.activity !== element.dataset.name;
    });
  },

  async unmount({ container }) {
    container.innerHTML = '';
  }
});
