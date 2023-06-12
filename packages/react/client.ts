import { ComponentType } from "react";
import { HEAD_CONTEXT } from "./head.js";
import { hydrateRoot } from "react-dom/client";
import { jsx } from "./jsx-runtime.js";
import { Handlers, RenderContext, ComponentProps, UnknownComponentProps, ErrorComponentProps } from "@web-widget/web-server";

export type { Handlers, ComponentProps };

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

  const vnode = jsx(HEAD_CONTEXT.Provider, {
    children: jsx(opts.component! as ComponentType<unknown>, props),
  });

  hydrateRoot(opts.container, vnode);
}