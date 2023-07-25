import { __ENV__ } from "./web-widget";
import { type Attributes, createElement } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { defineRender } from "@web-widget/schema/client";

export * from "@web-widget/schema/client";
export * from "./web-widget";
export { WebWidget as default } from "./web-widget";

Reflect.defineProperty(__ENV__, "server", {
  value: false
});

export const render = defineRender(
  async ( { recovering, container }, component, props) => {
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

