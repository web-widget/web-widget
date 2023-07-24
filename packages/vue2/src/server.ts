import Vue from "vue";
import { createRenderer } from "vue-server-renderer";
import type {
  RouteRenderContext,
  WidgetRenderContext,
} from "@web-widget/schema/server";
import { defineRender } from "@web-widget/schema/server";

export type * from "@web-widget/schema/server";
export const render = defineRender((component, props) => async (opts) => {
  const renderer = createRenderer();
  const app = new Vue({
    render(h) {
      return h(component, props as Record<string, any>);
    },
  });

  // TODO renderer.renderToStream() to ReadableStream
  return renderer.renderToString(app);
});
