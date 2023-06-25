import { createSSRApp } from "vue";
import { renderToWebStream } from "vue/server-renderer";
import type {
  Handlers,
  RenderContext,
  RenderResult,
  ComponentProps,
  UnknownComponentProps,
  ErrorComponentProps,
} from "@web-widget/web-server";

export type { Handlers, ComponentProps };

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

  const isIsland = !url;
  const props = isIsland
    ? data || {}
    : ({
        params: params,
        url: url,
        route: route,
        data: data,
        error: error,
      } as ComponentProps<any> | UnknownComponentProps | ErrorComponentProps);

  const app = createSSRApp(component, props as Record<string, any>);

  return renderToWebStream(app);
}
