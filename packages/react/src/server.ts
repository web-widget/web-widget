import { ComponentType, createElement } from "react";
// @ts-ignore
import * as ReactDOMServer from "react-dom/server.browser";
// import { HEAD_CONTEXT } from "./head";
import type {
  ComponentProps,
  ErrorComponentProps,
  Handlers,
  Meta,
  RenderContext,
  RenderResult,
  UnknownComponentProps,
} from "@web-widget/web-server";
import { __ENV__ } from "./web-widget";

export * from "./web-widget";
export { WebWidget as default } from "./web-widget";
export type { ComponentProps, Handlers, Meta };

__ENV__.server = true;

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

  // const vnode = createElement(HEAD_CONTEXT.Provider, {
  //   children: createElement(component! as ComponentType<unknown>, props),
  // });

  const vnode = createElement(component! as ComponentType<unknown>, props);

  return ReactDOMServer.renderToReadableStream(vnode);
}
