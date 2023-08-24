import { __ENV__ } from "./web-widget";
import { createElement } from "react";
import type { Attributes, ReactNode } from "react";
import type { Root } from "react-dom/client";
import { createRoot, hydrateRoot } from "react-dom/client";
import { defineRender } from "@web-widget/schema/client-helpers";

export * from "@web-widget/schema/client-helpers";
export * from "./web-widget";
export { WebWidget as default } from "./web-widget";

Reflect.defineProperty(__ENV__, "server", {
  value: false,
});

export const render = defineRender(async (context, component, props) => {
  const { recovering, container } = context;

  if (!container) {
    throw new Error(`Container required.`);
  }

  let root: Root | null;
  return {
    async mount() {
      let vnode: ReactNode;
      if (
        typeof component === "function" &&
        component.constructor.name === "AsyncFunction"
      ) {
        // experimental
        vnode = (await component(props)) as ReactNode;
      } else {
        vnode = createElement(component, props as Attributes) as ReactNode;
      }
      if (recovering) {
        root = hydrateRoot(container as Element, vnode);
      } else {
        root = createRoot(container);
        root.render(vnode);
      }
    },

    async unmount() {
      root?.unmount();
      root = null;
    },
  };
});
