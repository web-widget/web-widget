import { createApp, createSSRApp } from "vue";
import { defineRender } from "@web-widget/schema/client";

export type * from "@web-widget/schema/client";
export const render = defineRender(
  async ({ recovering, container }, component, props) => {
    if (!container) {
      throw new Error(`Container required.`);
    }

    if (recovering) {
      createSSRApp(component, props as Record<string, any>).mount(container);
    } else {
      createApp(component, props as Record<string, any>).mount(container);
    }
  }
);
