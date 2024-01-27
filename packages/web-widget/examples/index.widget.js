export default () => ({
  async mount({ container, data }) {
    container.innerHTML = `
      <ol>
        ${data
          .map(({ name, value }) => `<li><a href="${value}">${name}</a></li>`)
          .join("")}
      </ol>
    `;
  },
  async unmount({ container }) {
    container.innerHTML = ``;
  },
});
