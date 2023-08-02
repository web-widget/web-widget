import { __ENV__ } from "./web-widget";
import { type Attributes, createElement } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { defineRender, isRouteRenderContext } from "@web-widget/schema/client";

export * from "@web-widget/schema/client";
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

  let vnode;
  if (
    typeof component === "function" &&
    component.constructor.name === "AsyncFunction"
  ) {
    if (isRouteRenderContext(context)) {
      // experimental
      vnode = await component(props);
    } else {
      throw new Error("Async widget components are not supported.");
    }
  } else {
    vnode = createElement(component, props as Attributes);
  }

  if (recovering) {
    hydrateRoot(container, vnode);
  } else {
    createRoot(container).render(vnode);
  }
});
