/* eslint-disable no-console */
/* eslint-disable no-undef */

export default () => {
  let element;
  return {
    async bootstrap() {
      console.log('demo bootstrap');
      element = document.createElement('div');
    },
    async mount({ container, context }) {
      console.log('demo mount');

      element.innerHTML = `
        <div style="border: 3px dashed #acacac;">
          <button id="close-self">✕</button>
          <button id="load-remote-widget">Load Remote Widget</button>
          <button id="load-local-widget">Load Local Widget</button>
          <div id="widget-container"></div>
        <div>
      `;

      container.appendChild(element);

      container.querySelector('#close-self').onclick = () => {
        context.unmount();
      };

      container.querySelector('#load-remote-widget').onclick = () => {
        const app = document.createElement('web-widget');
        app.src = './lit-element-todomvc.widget.js';
        container.querySelector('#widget-container').appendChild(app);
      };

      container.querySelector('#load-local-widget').onclick = () => {
        const parent = document.createElement('web-widget');
        parent.application = () => ({
          async mount({ container }) {
            console.log('aaa mount');
            container.innerHTML = `
              <h3 style="color: red">Todo</h3>
              <p><slot name="main"></slot></p>
            `;
          },
          async unmount({ container }) {
            console.log('aaa unmount');
            container.innerHTML = '';
          }
        });
        container.querySelector('#widget-container').appendChild(parent);
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
  };
};
