import Vue from "vue";
// @ts-ignore
import { createRenderer } from "vue-server-renderer/build.prod.js";
import type {
  ComponentProps,
  RenderContext,
} from "@web-widget/schema/server-helpers";
import { defineRender } from "@web-widget/schema/server-helpers";

export * from "@web-widget/schema/server-helpers";
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
  return defineRender(async (context, component, props) => {
    const vNodeData: Vue.VNodeData = {
      props: props as Record<string, any>,
    };
    const renderer = createRenderer();
    const app = new Vue({
      render(h) {
        return h(component, vNodeData);
      },
      ...onBeforeCreateApp(context, component, props),
    });

    onCreatedApp(app, context, component, props);

    const content = await renderer.renderToString(app);
    return `<div data-vue2-shell>` + content + "</div>";
  });
};

export const render = defineVueRender();
