import { createSSRApp } from "vue";
import { renderToWebStream } from "vue/server-renderer";
import { defineRender } from "@web-widget/schema/server";

export * from "@web-widget/schema/server";
export const render = defineRender(async (context, component, props) => {
  const app = createSSRApp(component, props as Record<string, any>);
  return renderToWebStream(app);
});
