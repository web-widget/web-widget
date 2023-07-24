import { __ENV__ } from "./web-widget";
import { type Attributes, createElement } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import type {
  RouteRenderContext,
  WidgetRenderContext,
} from "@web-widget/schema/client";
import { defineRender } from "@web-widget/schema/client";

export type * from "@web-widget/schema/client";
export * from "./web-widget";
export { WebWidget as default } from "./web-widget";

Reflect.defineProperty(__ENV__, "server", {
  value: false
});

export const render = defineRender(
  (component, props) => async (opts) => {
    const { recovering, container } = opts;

    if (!container) {
      throw new Error(`Container required.`);
    }
  
    if (
      typeof component === "function" &&
      component.constructor.name === "AsyncFunction"
    ) {
      throw new Error("Async components are not supported.");
    }

    const vnode = createElement(component, props as Attributes);

    if (recovering) {
      hydrateRoot(container, vnode);
    } else {
      createRoot(container).render(vnode);
    }
  }
);

