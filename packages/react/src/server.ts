import { __ENV__ } from "./web-widget";
import { type Attributes, createElement } from "react";
// @ts-ignore
import * as ReactDOMServer from "react-dom/server.browser";
import { defineRender } from "@web-widget/schema/server";

export type * from "@web-widget/schema/server";
export * from "./web-widget";
export { WebWidget as default } from "./web-widget";

Reflect.defineProperty(__ENV__, "server", {
  value: true
});

export const render = defineRender(
  async (context, component, props) => {
    if (
      typeof component === "function" &&
      component.constructor.name === "AsyncFunction"
    ) {
      throw new Error("Async components are not supported.");
    }
    
    const vnode = createElement(component, props as Attributes);
    return ReactDOMServer.renderToReadableStream(vnode);
  }
);
