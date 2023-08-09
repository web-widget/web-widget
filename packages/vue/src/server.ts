import { createSSRApp } from "vue";
import { defineRender } from "@web-widget/schema/server-helpers";
import { renderToWebStream } from "vue/server-renderer";

export * from "@web-widget/schema/server-helpers";
export const render = defineRender(async (context, component, props) => {
  const app = createSSRApp(component, props as Record<string, any>);
  return renderToWebStream(app);
});
