import {
  defineRender,
  getComponentDescriptor,
  type ComponentProps,
} from "@web-widget/schema/client-helpers";
import { createElement, StrictMode } from "react";
import type { Root } from "react-dom/client";
import { createRoot, hydrateRoot } from "react-dom/client";
import type { CreateReactRenderOptions } from "./types";

export * from "@web-widget/schema/client-helpers";
export { useWidgetSyncState as useWidgetState } from "@web-widget/schema/client-helpers";
export * from "./components";

export const createReactRender = ({
  onPrefetchData,
}: CreateReactRenderOptions = {}) => {
  if (onPrefetchData) {
    throw new Error(`"onPrefetchData" is not supported.`);
  }

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
