import Vue from "vue";
import { defineRender as defineRenderHelper } from "@web-widget/schema/client-helpers";

export * from "@web-widget/schema/client-helpers";
export interface DefineVueRenderOptions {
  onBeforeCreateApp?: () => any;
  onCreatedApp?: (app: Vue) => void;
}

export const defineVueRender = ({
  onBeforeCreateApp = () => ({}),
  onCreatedApp = () => {},
}: DefineVueRenderOptions = {}) => {
  return defineRenderHelper(
    async ({ recovering, container }, component, props) => {
      if (!container) {
        throw new Error(`Container required.`);
      }

      let app: Vue | null;
      return {
        async mount() {
          const shell =
            (recovering
              ? container.querySelector("[data-vue2-shell]")
              : null) || container.appendChild(document.createElement("div"));

          app = new Vue({
            ...onBeforeCreateApp(),
            render(h) {
              return h(component, props as Record<string, any>);
            },
          });

          onCreatedApp(app);

          app.$mount(shell);
        },

        async unmount() {
          app?.$destroy();
          container.innerHTML = "";
          app = null;
        },
      };
    }
  );
};

export const render = defineVueRender();
