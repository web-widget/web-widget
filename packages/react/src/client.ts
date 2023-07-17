import { ComponentType, createElement } from "react";
// import { HEAD_CONTEXT } from "./head";
import { createRoot, hydrateRoot } from "react-dom/client";
import type {
  RenderContext,
  RenderResult,
  Render,
} from "@web-widget/web-server/client";
import { __ENV__ } from "./web-widget";

export * from "./web-widget";
export { WebWidget as default } from "./web-widget";
export { RenderContext, RenderResult, Render };

__ENV__.server = false;

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

  // const vnode = createElement(HEAD_CONTEXT.Provider, {
  //   children: createElement(component! as ComponentType<unknown>, props),
  // });

  const vnode = createElement(component! as ComponentType<unknown>, props);
  if (recovering) {
    hydrateRoot(container, vnode);
  } else {
    createRoot(container).render(vnode);
  }
}
