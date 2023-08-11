import Vue from "vue";
// @ts-ignore
import { createRenderer } from "@web-widget/vue-server-renderer/build.prod.js";
import { defineRender } from "@web-widget/schema/server-helpers";

export * from "@web-widget/schema/server-helpers";
export interface DefineVueRenderOptions {
  onBeforeCreateApp?: () => any;
  onCreatedApp?: (app: Vue) => void;
}

export const defineVueRender = ({
  onBeforeCreateApp = () => ({}),
  onCreatedApp = () => {},
}: DefineVueRenderOptions = {}) => {
  return defineRender(async (context, component, props) => {
    const renderer = createRenderer();
    const app = new Vue({
      ...onBeforeCreateApp(),
      render(h) {
        return h(component, props as Record<string, any>);
      },
    });

    onCreatedApp(app);

    const content = await renderer.renderToString(app);
    return `<div data-vue2-shell>` + content + "</div>";
  });
};

export const render = defineVueRender();
