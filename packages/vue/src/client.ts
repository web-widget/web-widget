import { createApp, createSSRApp } from "vue";
import type {
  RenderContext,
  RenderResult,
  Render,
} from "@web-widget/web-server/client";

export { RenderContext, RenderResult, Render };

export async function render(
  context: RenderContext<unknown>
): Promise<RenderResult> {
  const { component, recovering, container, data } = context;

  if (component === undefined) {
    throw new Error("This page does not have a component to render.");
  }

  if (!container) {
    throw new Error(`Container required.`);
  }

  const props = data || {};
  const create = recovering ? createSSRApp : createApp;
  const app = create(component, props as Record<string, any>);
  app.mount(container);
}
