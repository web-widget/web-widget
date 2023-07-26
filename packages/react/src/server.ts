import { __ENV__ } from "./web-widget";
import { type Attributes, createElement } from "react";
// @ts-ignore
import * as ReactDOMServer from "react-dom/server.browser";
import { defineRender, isRouteContext } from "@web-widget/schema/server";

export * from "@web-widget/schema/server";
export * from "./web-widget";
export { WebWidget as default } from "./web-widget";

Reflect.defineProperty(__ENV__, "server", {
  value: true
});

export const render = defineRender(
  async (context, component, props) => {
    let vnode;
    if (
      typeof component === "function" &&
      component.constructor.name === "AsyncFunction"
    ) {

      if (isRouteContext(context)) {
        // experimental
        vnode = await component(props);
      } else {
        throw new Error("Async widget components are not supported.");
      }

    } else {
      vnode = createElement(component, props as Attributes);
    }
    
    return ReactDOMServer.renderToReadableStream(vnode);
  }
);
