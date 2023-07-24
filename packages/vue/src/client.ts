import { createApp, createSSRApp } from "vue";
import type {
  RouteRenderContext,
  WidgetRenderContext,
} from "@web-widget/schema/client";
import { defineRender } from "@web-widget/schema/client";

export type * from "@web-widget/schema/client";
export const render = defineRender((component, props) => async (opts) => {
  const { recovering, container } = opts;

  if (!container) {
    throw new Error(`Container required.`);
  }

  if (recovering) {
    createSSRApp(component, props as Record<string, any>).mount(container);
  } else {
    createApp(component, props as Record<string, any>).mount(container);
  }
});
