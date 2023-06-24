export default () => ({
  async mount({ container, data, parameters }) {
    container.innerHTML = data
      .map(
        (name) =>
          `<div class="tabpanel" data-name="${name}" ${
            parameters.activity === name ? "" : "hidden"
          }><slot name="${name}"></slot></div>`
      )
      .join("");
  },

  async update({ container, parameters }) {
    container.querySelectorAll(`.tabpanel`).forEach((element) => {
      element.hidden = parameters.activity !== element.dataset.name;
    });
  },

  async unmount({ container }) {
    container.innerHTML = "";
  },
});
