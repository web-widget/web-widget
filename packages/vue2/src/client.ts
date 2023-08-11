import Vue from "vue";
import { defineRender } from "@web-widget/schema/client-helpers";

export * from "@web-widget/schema/client-helpers";
export const render = defineRender(
  async ({ recovering, container }, component, props) => {
    if (!container) {
      throw new Error(`Container required.`);
    }

    let app: Vue | null;
    return {
      async mount() {
        const shell =
          (recovering ? container.querySelector("[data-vue2-shell]") : null) ||
          container.appendChild(document.createElement("div"));

        app = new Vue({
          render(h) {
            return h(component, props as Record<string, any>);
          },
        });

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
