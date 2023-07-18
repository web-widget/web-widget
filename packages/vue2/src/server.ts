import Vue from "vue";
import { createRenderer } from "vue-server-renderer";
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
  const { component, url, params, route, error, data, meta } = context;

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

  const renderer = createRenderer();
  const app = new Vue({
    render(h) {
      return h(component, props as Record<string, any>);
    },
  });

  // TODO renderer.renderToStream() to ReadableStream
  return renderer.renderToString(app);
}
