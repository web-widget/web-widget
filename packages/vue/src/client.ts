import {
  defineRender,
  getComponentDescriptor,
} from "@web-widget/schema/client-helpers";
import type { App } from "vue";
import { createApp, createSSRApp } from "vue";
import type { CreateVueRenderOptions } from "./types";
import { __ENV__ } from "./web-widget";

export * from "@web-widget/schema/client-helpers";
export * from "./web-widget";

Reflect.defineProperty(__ENV__, "server", {
  value: false,
});

export const createVueRender = ({
  onCreatedApp = () => {},
  onPrefetchData,
}: CreateVueRenderOptions = {}) => {
  return defineRender(async (context) => {
    const componentDescriptor = getComponentDescriptor(context);
    const { component, props } = componentDescriptor;
    if (!context.container) {
      throw new Error(`Container required.`);
    }

    let app: App | null;

    return {
      async mount() {
        const state = context.recovering
          ? (context.container.querySelector(
              "script[as=state]"
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
          ? Object.assign(stateContent, props)
          : props;

        if (context.recovering) {
          app = createSSRApp(component, mergedProps);
        } else {
          app = createApp(component, mergedProps);
        }
        await onCreatedApp(app, context, component, mergedProps);

        app.mount(context.container);
      },

      async unmount() {
        app?.unmount();
        app = null;
      },
    };
  });
};

/**@deprecated Please use `createVueRender` instead.*/
export const defineVueRender = createVueRender;

export const render = createVueRender();
