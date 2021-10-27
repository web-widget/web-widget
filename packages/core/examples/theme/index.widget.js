export default () => ({
  async mount({ container }) {
    container.innerHTML = `
        <style>
          :host(.dark) h3 {
            color: #FFF;
            background: #000;
          }
        </style>
        <h3>hello world</h3>
      `;
  },

  async unmount({ container }) {
    container.innerHTML = '';
  }
});
