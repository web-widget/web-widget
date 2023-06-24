import { ComponentType } from "react";
import { HEAD_CONTEXT } from "./head.js";
import { createRoot, hydrateRoot } from "react-dom/client";
import { jsx } from "./jsx-runtime.js";
import {
  RenderContext,
  RenderResult,
  Render,
} from "@web-widget/web-server/client";

export { RenderContext, RenderResult, Render };

export async function render(
  opts: RenderContext<unknown>
): Promise<RenderResult> {
  if (opts.component === undefined) {
    throw new Error("This page does not have a component to render.");
  }

  if (!opts.container) {
    throw new Error(`Container required.`);
  }

  const props = opts.data;

  // const vnode = jsx(HEAD_CONTEXT.Provider, {
  //   children: jsx(opts.component! as ComponentType<unknown>, props),
  // });

  const vnode = jsx(opts.component! as ComponentType<unknown>, props);
  const create = opts.recovering ? hydrateRoot : createRoot;
  create(opts.container, vnode);
}
