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
export { useWidgetSyncState as useWidgetState } from "@web-widget/schema/server-helpers";
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

function createTimeoutSignal(ms: number): [AbortSignal, () => void] {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(
      new Error(`Component did not finish rendering within ${ms}ms.`)
    );
  }, ms);

  return [
    controller.signal,
    function disconnect() {
      clearTimeout(timer);
    },
  ];
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
    async (context, { react: reactRenderOptions = {} } = {}) => {
      let error, signal, disconnect;
      const componentDescriptor = getComponentDescriptor(context);
      const { component, props } = componentDescriptor;
      const onError = reactRenderOptions.onError;
      const awaitAllReady = reactRenderOptions.awaitAllReady;

      if (!reactRenderOptions.signal) {
        [signal, disconnect] = createTimeoutSignal(1000 * 10);
        reactRenderOptions.signal = signal;
      }

      reactRenderOptions.onError = (e) => {
        error = e;
        if (onError) {
          onError(e);
        } else if (!awaitAllReady) {
          console.error(`[@web-widget/react]`, e);
        }
      };

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

      if (awaitAllReady) {
        await stream.allReady;
      }

      if (disconnect) {
        disconnect();
      }

      if (error) {
        throw error;
      }

      return stream;
    }
  );
};

/**@deprecated Please use `createReactRender` instead.*/
export const defineReactRender = createReactRender;

export const render = createReactRender();
