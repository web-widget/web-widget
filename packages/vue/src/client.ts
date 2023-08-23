import { __ENV__ } from "./web-widget";
import type { App, Component } from "vue";
import { createApp, createSSRApp } from "vue";
import type {
  ComponentProps,
  RenderContext,
} from "@web-widget/schema/client-helpers";
import { defineRender } from "@web-widget/schema/client-helpers";

export * from "./web-widget";
export * from "@web-widget/schema/client-helpers";
export interface DefineVueRenderOptions {
  onCreatedApp?: (
    app: App,
    context: RenderContext,
    component: Component,
    props: ComponentProps
  ) => void;
}

Reflect.defineProperty(__ENV__, "server", {
  value: false,
});

export const defineVueRender = ({
  onCreatedApp = () => {},
}: DefineVueRenderOptions = {}) => {
  return defineRender(async (context, component, props) => {
    if (!context.container) {
      throw new Error(`Container required.`);
    }

    let app: App | null;

    return {
      async mount() {
        const rootProps = props as Record<string, any>;
        if (context.recovering) {
          app = createSSRApp(component, rootProps);
        } else {
          app = createApp(component, rootProps);
        }
        onCreatedApp(app, context, component, props);
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
