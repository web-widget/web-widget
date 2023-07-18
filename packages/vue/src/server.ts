import { createSSRApp } from "vue";
import { renderToWebStream } from "vue/server-renderer";
import type {
  ComponentProps,
  ErrorComponentProps,
  Handlers,
  Meta,
  RenderContext,
  RenderResult,
  UnknownComponentProps,
} from "@web-widget/web-server";

export type { ComponentProps, Handlers, Meta };

export async function render(
  context: RenderContext<unknown>
): Promise<RenderResult> {
  const { component, url, params, route, error, data } = context;

  if (component === undefined) {
    throw new Error("This page does not have a component to render.");
  }

  if (
    typeof component === "function" &&
    component.constructor.name === "AsyncFunction"
  ) {
    throw new Error("Async components are not supported.");
  }

  const isWidget = !url;
  const props = isWidget
    ? data || {}
    : ({
        data,
        error: error,
        params: params,
        route: route,
        url: url,
      } as ComponentProps<any> | UnknownComponentProps | ErrorComponentProps);

  const app = createSSRApp(component, props as Record<string, any>);

  return renderToWebStream(app);
}
