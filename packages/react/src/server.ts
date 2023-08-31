import { __ENV__ } from "./web-widget";
import { Fragment } from "react";
import { type Attributes, createElement } from "react";
// @ts-ignore
import * as ReactDOMServer from "react-dom/server.browser";
import { defineRender } from "@web-widget/schema/server-helpers";
import type { DefineVueRenderOptions } from "./types";

export * from "@web-widget/schema/server-helpers";
export * from "./web-widget";

Reflect.defineProperty(__ENV__, "server", {
  value: true,
});

const ESCAPE_LOOKUP: { [match: string]: string } = {
  ">": "\\u003e",
  "<": "\\u003c",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

const ESCAPE_REGEX = /[><\u2028\u2029]/g;

// This utility is based on https://github.com/zertosh/htmlescape
// License: https://github.com/zertosh/htmlescape/blob/0527ca7156a524d256101bb310a9f970f63078ad/LICENSE
function htmlEscapeJsonString(str: string): string {
  return str.replace(ESCAPE_REGEX, (match) => ESCAPE_LOOKUP[match]);
}

export const defineReactRender = ({
  onPrefetchData,
}: DefineVueRenderOptions = {}) => {
  return defineRender(async (context, component, props) => {
    const state = onPrefetchData
      ? await onPrefetchData(context, component, props)
      : undefined;
    const mergedProps = state ? Object.assign(state, props) : props;

    let vNode;
    if (
      typeof component === "function" &&
      component.constructor.name === "AsyncFunction"
    ) {
      // experimental
      vNode = await component(mergedProps);
    } else {
      vNode = createElement(component, mergedProps as Attributes);
    }

    if (state) {
      return ReactDOMServer.renderToReadableStream(
        createElement(Fragment, null, [
          vNode,
          createElement("script", {
            as: "state",
            type: "application/json",
            dangerouslySetInnerHTML: {
              __html: htmlEscapeJsonString(JSON.stringify(state)),
            },
          }),
        ])
      );
    } else {
      return ReactDOMServer.renderToReadableStream(vNode);
    }
  });
};

export const render = defineReactRender();
