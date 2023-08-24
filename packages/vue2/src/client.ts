import Vue from "vue";
import type {
  ComponentProps,
  RenderContext,
} from "@web-widget/schema/client-helpers";
import { defineRender as defineRenderHelper } from "@web-widget/schema/client-helpers";

export * from "./web-widget";
export * from "@web-widget/schema/client-helpers";
export interface DefineVueRenderOptions {
  onBeforeCreateApp?: (
    context: RenderContext,
    component: Vue.Component,
    props: ComponentProps
  ) => any;
  onCreatedApp?: (
    app: Vue,
    context: RenderContext,
    component: Vue.Component,
    props: ComponentProps
  ) => void;
}

export const defineVueRender = ({
  onBeforeCreateApp = () => ({}),
  onCreatedApp = () => {},
}: DefineVueRenderOptions = {}) => {
  return defineRenderHelper(async (context, component, props) => {
    if (!context.container) {
      throw new Error(`Container required.`);
    }

    let app: Vue | null;
    const vNodeData: Vue.VNodeData = {
      props: props as Record<string, any>,
    };
    return {
      async mount() {
        const shell =
          (context.recovering
            ? context.container.querySelector("[data-vue2-shell]")
            : null) ||
          context.container.appendChild(document.createElement("div"));

        app = new Vue({
          render(h) {
            return h(component, vNodeData);
          },
          ...onBeforeCreateApp(context, component, props),
        });

        onCreatedApp(app, context, component, props);

        app.$mount(shell);
      },

      async unmount() {
        app?.$destroy();
        if (context.container instanceof Element) {
          context.container.innerHTML = "";
        }
        app = null;
      },
    };
  });
};

export const render = defineVueRender();
