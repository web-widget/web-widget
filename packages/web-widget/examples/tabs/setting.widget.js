// eslint-disable-next-line import/no-unresolved
import { html, render } from 'https://unpkg.com/lit-html?module';

export default () => {
  let element;
  return {
    async mount({ container, data }) {
      element = document.createElement('div');
      element.style = 'border: 1px solid #000';

      const { active, length } = data;

      render(
        html`
          Set active tab:
          <select name="active">
            <option value="">None</option>
            ${Array.apply(null, Array(length)).map(
              (n, index) =>
                html`<option value="${index}" ?selected=${active === index}>
                  Tab ${index + 1}
                </option>`
            )}
          </select>
        `,
        container
      );
    },

    async unmount({ container }) {
      container.innerHTML = '';
    }
  };
};
