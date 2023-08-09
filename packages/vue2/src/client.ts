import Vue from "vue";
import { defineRender } from "@web-widget/schema/client-helpers";

export * from "@web-widget/schema/client-helpers";
export const render = defineRender(
  async ({ recovering, container }, component, props) => {
    if (!container) {
      throw new Error(`Container required.`);
    }

    const shell =
      (recovering ? container.querySelector("[data-vue2-shell]") : null) ||
      document.createElement("div");

    container.appendChild(shell);

    const app = new Vue({
      render(h) {
        return h(component, props as Record<string, any>);
      },
    });

    app.$mount(shell);
  }
);
