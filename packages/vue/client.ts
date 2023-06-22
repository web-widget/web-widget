import { createApp, createSSRApp } from "vue";
import { Handlers, RenderContext, RenderResult, ComponentProps, UnknownComponentProps, ErrorComponentProps } from "@web-widget/web-server";

export type { Handlers, ComponentProps };

export async function render(opts: RenderContext<unknown>): Promise<RenderResult> {

  if (opts.component === undefined) {
    throw new Error("This page does not have a component to render.");
  }

  if (
    typeof opts.component === "function" &&
    opts.component.constructor.name === "AsyncFunction"
  ) {
    throw new Error(
      "Async components are not supported.",
    );
  }

  if (!opts.container) {
    throw new Error(`Container required.`);
  }

  const isIsland = !opts.url;
  const props = isIsland ? opts.data : {
    params: opts.params,
    url: opts.url,
    route: opts.route,
    data: opts.data,
    error: opts.error
  } as ComponentProps<any> | UnknownComponentProps | ErrorComponentProps;

  const recovering = opts.recovering;
  const create = recovering ? createSSRApp : createApp;
  const app = create(opts.component, props as Record<string, any>);
  app.mount(opts.container);
}