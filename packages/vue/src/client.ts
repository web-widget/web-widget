import {
  defineRender,
  getComponentDescriptor,
} from "@web-widget/schema/client-helpers";
import type { App } from "vue";
import { Suspense, createApp, createSSRApp, h } from "vue";
import type { CreateVueRenderOptions } from "./types";
import { __ENV__ } from "./web-widget";

export * from "@web-widget/schema/client-helpers";
export * from "./web-widget";

Reflect.defineProperty(__ENV__, "server", {
  value: false,
});

export const createVueRender = ({
  onCreatedApp = async () => {},
  onPrefetchData,
}: CreateVueRenderOptions = {}) => {
  if (onPrefetchData) {
    throw new Error(`"onPrefetchData" is not supported.`);
  }

  return defineRender(async (context) => {
    const componentDescriptor = getComponentDescriptor(context);
    const { component, props } = componentDescriptor;
    if (!context.container) {
      throw new Error(`Container required.`);
    }

    let app: App | null;
    const WrapSuspense = (props: any) =>
      h(Suspense, null, [h(component, props)]);

    return {
      async mount() {
        if (context.recovering) {
          app = createSSRApp(WrapSuspense, props as any);
        } else {
          app = createApp(WrapSuspense, props as any);
        }
        await onCreatedApp(app, context, component, props);

        app.runWithContext(() => {
          app!.mount(context.container);
        });
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
