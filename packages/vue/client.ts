import { createApp, createSSRApp } from "vue";
import {
  RenderContext,
  RenderResult,
  Render,
} from "@web-widget/web-server/client";

export { RenderContext, RenderResult, Render };

export async function render(
  opts: RenderContext<unknown>
): Promise<RenderResult> {
  if (opts.component === undefined) {
    throw new Error("This page does not have a component to render.");
  }

  if (!opts.container) {
    throw new Error(`Container required.`);
  }

  const props = opts.data;

  const recovering = opts.recovering;
  const create = recovering ? createSSRApp : createApp;
  const app = create(opts.component, props as Record<string, any>);
  app.mount(opts.container);
}
