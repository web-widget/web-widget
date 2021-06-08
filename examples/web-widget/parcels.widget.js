/* eslint-disable no-console */
/* eslint-disable no-undef */

let element;
define({
  async bootstrap() {
    console.log('demo bootstrap');
    element = document.createElement('div');
  },
  async mount({ container, context, createPortal }) {
    console.log('demo mount');

    element.innerHTML = `
      <div style="border: 3px dashed #acacac;">
        <button id="close-self">✕</button>
        <button id="open-portal">Open Portal</button>
        <button id="mount-parcel">Mount Parcel</button>
        <button id="mount-widget">Mount Widget</button>
        <div id="mount-parcel-container"></div>
      <div>
    `;

    container.appendChild(element);

    container.querySelector('#close-self').onclick = () => {
      context.unmount();
    };

    container.querySelector('#open-portal').onclick = () => {
      const app = document.createElement('web-widget');
      app.id = '#app-portal-demo';
      app.src = './lit-element-todomvc.widget.js';
      createPortal(app, 'dialog')
        .mount()
        .then(() => {
          console.log('dialog opened');
        });
    };

    container.querySelector('#mount-parcel').onclick = () => {
      const app = document.createElement('web-widget');
      app.src = './lit-element-todomvc.widget.js';
      container.querySelector('#mount-parcel-container').appendChild(app);
    };

    container.querySelector('#mount-widget').onclick = () => {
      const parent = document.createElement('web-widget');
      parent.application = async () => {
        return `define(${(() => {
          return {
            async mount({ container }) {
              console.log('aaa mount');
              container.innerHTML = 'hahah<slot name="main"></slot>';
            },
            async unmount({ container }) {
              console.log('aaa unmount');
              container.innerHTML = '';
            }
          };
        }).toString()})`;
      };
      container.querySelector('#mount-parcel-container').appendChild(parent);
      const app = document.createElement('web-widget');
      app.src = './lit-element-todomvc.widget.js';
      app.slot = 'main';
      parent.appendChild(app);
    };
  },
  async unmount({ container }) {
    console.log('demo unmount');
    container.removeChild(element);
  },
  async unload() {
    console.log('demo unload');
    element = null;
  }
});
