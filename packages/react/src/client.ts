import {
  defineRender,
  getComponentDescriptor,
  type ComponentProps,
} from "@web-widget/schema/client-helpers";
import { createElement, StrictMode } from "react";
import type { Root } from "react-dom/client";
import { createRoot, hydrateRoot } from "react-dom/client";
import type { CreateReactRenderOptions } from "./types";
import { __ENV__ } from "./web-widget";

export * from "@web-widget/schema/client-helpers";
export * from "./web-widget";

Reflect.defineProperty(__ENV__, "server", {
  value: false,
});

export const createReactRender = ({
  onPrefetchData,
}: CreateReactRenderOptions = {}) => {
  return defineRender(async (context) => {
    const { recovering, container } = context;
    const componentDescriptor = getComponentDescriptor(context);
    const { component, props } = componentDescriptor;

    if (!container) {
      throw new Error(`Container required.`);
    }

    let root: Root | null;
    return {
      async mount() {
        const state = context.recovering
          ? (context.container.querySelector(
              "script[as=state]"
            ) as HTMLScriptElement)
          : null;
        const stateContent =
          context.recovering && state
            ? JSON.parse(state.textContent as string)
            : onPrefetchData
            ? await onPrefetchData(context, component, props)
            : undefined;
        state?.remove();

        const mergedProps = (
          stateContent ? Object.assign(stateContent, props) : props
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

        vNode = createElement(StrictMode, null, vNode);

        if (recovering) {
          root = hydrateRoot(context.container as Element, vNode);
        } else {
          root = createRoot(context.container);
          root.render(vNode);
        }
      },

      async unmount() {
        root?.unmount();
        root = null;
      },
    };
  });
};

/**@deprecated Please use `createReactRender` instead.*/
export const defineReactRender = createReactRender;

export const render = createReactRender();
