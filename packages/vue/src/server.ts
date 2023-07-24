import { createSSRApp } from "vue";
import { renderToWebStream } from "vue/server-renderer";
import type {
  RouteRenderContext,
  WidgetRenderContext,
} from "@web-widget/schema/server";
import { defineRender } from "@web-widget/schema/server";

export type * from "@web-widget/schema/server";
export const render = defineRender((component, props) => async () => {
  const app = createSSRApp(component, props as Record<string, any>);
  return renderToWebStream(app);
});
