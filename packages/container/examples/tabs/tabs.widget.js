// eslint-disable-next-line import/no-unresolved
import { html, render } from 'https://unpkg.com/lit-html?module';

function tabs({ container, active, length }) {
  const template = html`
    <div class="tabs">
      <div class="labels">
        ${Array.apply(null, Array(length)).map(
          (n, index) =>
            html`<slot
              name="label-${index}"
              ?active=${active === index}
              @click=${() => {
                tabs({ container, active: index, length });
              }}
            >
              <button>${index + 1}</button>
            </slot>`
        )}
      </div>
      <div class="contents">
        ${Array.apply(null, Array(length)).map(
          (n, index) =>
            html`<slot
              ?active=${active === index}
              name="content-${index}"
            ></slot>`
        )}
      </div>
    </div>
    <style>
      .tabs .labels slot {
        display: inline-block;
      }
      .tabs .contents slot {
        display: none;
      }
      .tabs .contents slot[active] {
        display: block;
      }
    </style>
  `;

  render(template, container);
}

export default () => ({
  async mount({ container, data }) {
    tabs({ container, ...data });
  },

  async update({ container, data }) {
    tabs({ container, ...data });
  },

  async unmount({ container }) {
    container.innerHTML = '';
  }
});
