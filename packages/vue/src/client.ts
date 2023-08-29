import { __ENV__ } from "./web-widget";
import type { App } from "vue";
import { createApp, createSSRApp } from "vue";
import { defineRender } from "@web-widget/schema/client-helpers";
import type { DefineVueRenderOptions } from "./types";

export * from "@web-widget/schema/client-helpers";
export * from "./web-widget";

Reflect.defineProperty(__ENV__, "server", {
  value: false,
});

export const defineVueRender = ({
  onCreatedApp = () => {},
  onPrefetchData,
}: DefineVueRenderOptions = {}) => {
  return defineRender(async (context, component, props) => {
    if (!context.container) {
      throw new Error(`Container required.`);
    }

    let app: App | null;

    return {
      async mount() {
        const state = context.recovering
          ? (context.container.querySelector(
              "[webwidgetstate]"
            ) as HTMLScriptElement)
          : null;
        const stateContent =
          context.recovering && state
            ? JSON.parse(state.textContent as string)
            : onPrefetchData
            ? await onPrefetchData(context, component, props)
            : undefined;
        state?.remove();

        const mergedProps = stateContent
          ? Object.assign({}, stateContent, props)
          : props;

        if (context.recovering) {
          app = createSSRApp(component, mergedProps);
        } else {
          app = createApp(component, mergedProps);
        }
        onCreatedApp(app, context, component, mergedProps);

        app.mount(context.container);
      },

      async unmount() {
        app?.unmount();
        app = null;
      },
    };
  });
};

export const render = defineVueRender();
