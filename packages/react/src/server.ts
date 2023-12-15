import {
  defineRender,
  getComponentDescriptor,
  type ComponentProps,
} from "@web-widget/schema/server-helpers";
import type { ReactNode } from "react";
import { createElement } from "react";
import { __ENV__ } from "./web-widget";

import type {
  ReactDOMServerReadableStream,
  RenderToReadableStreamOptions,
} from "react-dom/server";
// @ts-ignore
import * as ReactDOMServer from "react-dom/server.browser";
import type { CreateReactRenderOptions } from "./types";

export * from "@web-widget/schema/server-helpers";
export * from "./web-widget";

Reflect.defineProperty(__ENV__, "server", {
  value: true,
});

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

export const createReactRender = ({
  onPrefetchData,
}: CreateReactRenderOptions = {}) => {
  if (onPrefetchData) {
    throw new Error(`"onPrefetchData" is not supported.`);
  }

  return defineRender<ReactRenderOptions>(
    async (context, { react: reactRenderOptions } = {}) => {
      const componentDescriptor = getComponentDescriptor(context);
      const { component, props } = componentDescriptor;

      let vNode;
      if (
        typeof component === "function" &&
        component.constructor.name === "AsyncFunction"
      ) {
        // experimental
        vNode = await component(props as ComponentProps<any>);
      } else {
        vNode = createElement(component, props as ComponentProps<any>);
      }

      const stream = await renderToReadableStream(vNode, reactRenderOptions);

      if (reactRenderOptions?.awaitAllReady) {
        await stream.allReady;
      }

      return stream;
    }
  );
};

/**@deprecated Please use `createReactRender` instead.*/
export const defineReactRender = createReactRender;

export const render = createReactRender();
