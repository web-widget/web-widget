import type { App } from "vue";
import { createApp, createSSRApp } from "vue";

import { defineRender } from "@web-widget/schema/client-helpers";

export * from "@web-widget/schema/client-helpers";
export const render = defineRender(
  async ({ recovering, container }, component, props) => {
    if (!container) {
      throw new Error(`Container required.`);
    }

    let app: App | null;
    return {
      async mount() {
        if (recovering) {
          app = createSSRApp(component, props as Record<string, any>);
        } else {
          app = createApp(component, props as Record<string, any>);
        }
        app.mount(container);
      },

      async unmount() {
        app?.unmount();
        app = null;
      },
    };
  }
);
