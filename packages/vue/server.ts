import { createApp, createSSRApp } from "vue";
import { renderToWebStream } from "vue/server-renderer";
import { Handlers, RenderContext, RenderResult, ComponentProps, UnknownComponentProps, ErrorComponentProps } from "@web-widget/web-server";

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

  const props: ComponentProps<any> | UnknownComponentProps | ErrorComponentProps = {
    params: opts.params,
    url: opts.url,
    route: opts.route,
    data: opts.data,
    error: opts.error
  };

  const app = createSSRApp(opts.component, props);

  return renderToWebStream(app);
}