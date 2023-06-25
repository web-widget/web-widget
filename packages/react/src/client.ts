import { ComponentType } from "react";
// import { HEAD_CONTEXT } from "./head";
import { createRoot, hydrateRoot } from "react-dom/client";
import { jsx } from "./jsx-runtime";
import type {
  RenderContext,
  RenderResult,
  Render,
} from "@web-widget/web-server/client";

export { RenderContext, RenderResult, Render };

export async function render(
  context: RenderContext<unknown>
): Promise<RenderResult> {
  const { component, recovering, container, data } = context;

  if (component === undefined) {
    throw new Error("This page does not have a component to render.");
  }

  if (!container) {
    throw new Error(`Container required.`);
  }

  const props = data || {};

  // const vnode = jsx(HEAD_CONTEXT.Provider, {
  //   children: jsx(component! as ComponentType<unknown>, props),
  // });

  const vnode = jsx(component! as ComponentType<unknown>, props);
  const create = recovering ? hydrateRoot : createRoot;
  create(container, vnode);
}
