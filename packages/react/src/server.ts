import {
  defineRender,
  getComponentDescriptor,
  type ComponentProps,
} from "@web-widget/schema/server-helpers";
import type { ReactNode } from "react";
import { Fragment, createElement } from "react";
import { __ENV__ } from "./web-widget";

import type {
  ReactDOMServerReadableStream,
  RenderToReadableStreamOptions,
} from "react-dom/server";
// @ts-ignore
import * as ReactDOMServer from "react-dom/server.browser";
import type { DefineReactRenderOptions } from "./types";

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

function renderToReadableStream(
  vNode: ReactNode,
  renderOptions?: RenderToReadableStreamOptions
): Promise<ReactDOMServerReadableStream> {
  return ReactDOMServer.renderToReadableStream(vNode, renderOptions);
}

export interface ReactRenderOptions {
  react?: {
    awaitAllReady?: boolean;
  } & RenderToReadableStreamOptions;
}

export const defineReactRender = ({
  onPrefetchData,
}: DefineReactRenderOptions = {}) => {
  return defineRender<ReactRenderOptions>(
    async (context, { react: reactRenderOptions } = {}) => {
      const componentDescriptor = getComponentDescriptor(context);
      const { component, props } = componentDescriptor;
      const state = onPrefetchData
        ? await onPrefetchData(context, component, props)
        : undefined;
      const mergedProps = (
        state ? Object.assign({}, state, props) : props
      ) as ComponentProps<any>;

      let vNode;
      if (
        typeof component === "function" &&
        component.constructor.name === "AsyncFunction"
      ) {
        // experimental
        vNode = await component(mergedProps);
      } else {
        vNode = createElement(component, mergedProps);
      }

      const stream = state
        ? await renderToReadableStream(
            createElement(Fragment, null, [
              vNode,
              createElement("script", {
                as: "state",
                type: "application/json",
                dangerouslySetInnerHTML: {
                  __html: htmlEscapeJsonString(JSON.stringify(state)),
                },
              }),
            ]),
            reactRenderOptions
          )
        : await renderToReadableStream(vNode, reactRenderOptions);

      if (reactRenderOptions?.awaitAllReady) {
        await stream.allReady;
      }

      return stream;
    }
  );
};

export const render = defineReactRender();
