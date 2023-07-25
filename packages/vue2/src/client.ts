import Vue from "vue";
import { defineRender } from "@web-widget/schema/client";

export type * from "@web-widget/schema/client";
export const render = defineRender(
  async ({ recovering, container }, component, props) => {
    if (!container) {
      throw new Error(`Container required.`);
    }

    const app = new Vue({
      render(h) {
        return h(component, props as Record<string, any>);
      },
    });

    app.$mount(container);
  },
  {
    // @ts-ignore
    dev: import.meta.env?.DEV,
  }
);
