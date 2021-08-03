/* eslint-disable no-console */
/* eslint-disable no-undef */

let element;
define({
  async bootstrap() {
    console.log('demo bootstrap');
    element = document.createElement('div');
  },
  async mount({ container, context, createPortal, portalDestinations }) {
    console.log('demo mount');

    element.innerHTML = `
      <div style="border: 3px dashed #acacac;">
        <button id="close-self">✕</button>
        <button id="open-portal">Open Portal</button>
        <button id="define-destination">Define PortalDestinations</button>
      <div>
    `;

    container.appendChild(element);

    container.querySelector('#close-self').onclick = () => {
      context.unmount();
    };

    container.querySelector('#define-destination').onclick = () => {
      portalDestinations.define('dialog', () => {
        const widget = document.createElement('web-widget');
        widget.id = 'dd';
        widget.application = () => ({
          async bootstrap({ container }) {
            const dialogMain = document.createElement('slot');
            container.appendChild(dialogMain);
            console.log('dialog bootstrap');
          },
          async mount() {
            console.log('dialog mount');
          },
          async unmount() {
            console.log('dialog unmount');
          }
        });

        container.appendChild(widget);
        return widget;
      });
    };

    container.querySelector('#open-portal').onclick = () => {
      const app = document.createElement('web-widget');
      app.id = 'app-portal-demo';
      app.src = './lit-element-todomvc.widget.js';
      createPortal(app, 'dialog')
        .mount()
        .then(() => {
          console.log('dialog opened');
        });
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
