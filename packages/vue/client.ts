import { createApp, createSSRApp } from "vue";
import { Handlers, RenderContext, RenderResult, ComponentProps, UnknownComponentProps, ErrorComponentProps } from "@web-widget/web-server";

export async function render(opts: RenderContext<unknown>): Promise<void> {

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
    throw new Error(`Container required`);
  }

  const props: ComponentProps<any> | UnknownComponentProps | ErrorComponentProps = {
    params: opts.params,
    url: opts.url,
    route: opts.route,
    data: opts.data,
    error: opts.error
  };

  const recovering = opts.recovering;
  const app = recovering ? createSSRApp(opts.component, props) : createApp(opts.component, props);
  app.mount(opts.container);
}