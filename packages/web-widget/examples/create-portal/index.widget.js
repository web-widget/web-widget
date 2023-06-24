/* eslint-disable no-console */
export default () => {
  let element;
  return {
    async bootstrap() {
      console.log("demo bootstrap");
      element = document.createElement("div");
    },
    async mount({ container, createPortal }) {
      console.log("demo mount");

      element.innerHTML = `
        <div style="border: 3px dashed #acacac;">
          <button id="close-self">✕</button>
          <button id="open-portal">Open Portal</button>
        <div>
      `;

      container.appendChild(element);

      container.querySelector("#close-self").onclick = () => {
        container.unmount();
      };

      container.querySelector("#open-portal").onclick = () => {
        const app = document.createElement("web-widget");
        app.id = "app-portal-demo";
        app.src = "./lit-element-todomvc.widget.js";
        createPortal(app, "modalDialog")
          .mount()
          .then(() => {
            console.log("dialog opened");
          });
      };
    },
    async unmount({ container }) {
      console.log("demo unmount");
      container.removeChild(element);
    },
    async unload() {
      console.log("demo unload");
      element = null;
    },
  };
};
