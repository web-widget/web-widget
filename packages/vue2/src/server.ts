import Vue from "vue";
import { createRenderer } from "vue-server-renderer";
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

  const isWidget = !url;
  const props = isWidget
    ? data || {}
    : ({
        params: params,
        url: url,
        route: route,
        data: data,
        error: error,
      } as ComponentProps<any> | UnknownComponentProps | ErrorComponentProps);

  const renderer = createRenderer();
  const app = new Vue({
    render(h) {
      return h(component, props as Record<string, any>);
    },
  });

  // TODO renderer.renderToStream() to ReadableStream
  return renderer.renderToString(app);
}
