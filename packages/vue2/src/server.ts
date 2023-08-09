import Vue from "vue";
// @ts-ignore
import { createRenderer } from "@web-widget/vue-server-renderer/build.prod.js";
import { defineRender } from "@web-widget/schema/server-helpers";

export * from "@web-widget/schema/server-helpers";
export const render = defineRender(async (context, component, props) => {
  const renderer = createRenderer();
  const app = new Vue({
    render(h) {
      return h(component, props as Record<string, any>);
    },
  });

  // TODO renderer.renderToStream() to ReadableStream
  const content = await renderer.renderToString(app);
  return `<div data-vue2-shell>` + content + "</div>";
});
