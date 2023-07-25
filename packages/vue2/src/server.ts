import Vue from "vue";
import { createRenderer } from "vue-server-renderer";
import { defineRender } from "@web-widget/schema/server";

export type * from "@web-widget/schema/server";
export const render = defineRender(async (context, component, props) => {
  const renderer = createRenderer();
  const app = new Vue({
    render(h) {
      return h(component, props as Record<string, any>);
    },
  });

  // TODO renderer.renderToStream() to ReadableStream
  return renderer.renderToString(app);
});
