import { ComponentType } from "react";
import { HEAD_CONTEXT } from "./head.js";
import { jsx } from "./jsx-runtime.js";
import {
  Handlers,
  RenderContext,
  RenderResult,
  ComponentProps,
  UnknownComponentProps,
  ErrorComponentProps,
} from "@web-widget/web-server";
// @ts-ignore
import * as ReactDOMServer from "react-dom/server.browser";

export type { Handlers, ComponentProps };

export async function render(
  opts: RenderContext<unknown>
): Promise<RenderResult> {
  if (opts.component === undefined) {
    throw new Error("This page does not have a component to render.");
  }

  if (
    typeof opts.component === "function" &&
    opts.component.constructor.name === "AsyncFunction"
  ) {
    throw new Error("Async components are not supported.");
  }

  const isIsland = !opts.url;
  const props = isIsland
    ? opts.data
    : ({
        params: opts.params,
        url: opts.url,
        route: opts.route,
        data: opts.data,
        error: opts.error,
      } as ComponentProps<any> | UnknownComponentProps | ErrorComponentProps);

  // const vnode = jsx(HEAD_CONTEXT.Provider, {
  //   children: jsx(opts.component! as ComponentType<unknown>, props),
  // });

  const vnode = jsx(opts.component! as ComponentType<unknown>, props);

  return ReactDOMServer.renderToReadableStream(vnode);
}
