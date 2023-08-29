import { __ENV__ } from "./web-widget";
import { createElement } from "react";
import type { Attributes, ReactNode } from "react";
import type { Root } from "react-dom/client";
import { createRoot, hydrateRoot } from "react-dom/client";
import { defineRender } from "@web-widget/schema/client-helpers";
import type { DefineVueRenderOptions } from "./types";

export * from "@web-widget/schema/client-helpers";
export * from "./web-widget";

Reflect.defineProperty(__ENV__, "server", {
  value: false,
});

export const defineReactRender = ({
  onPrefetchData,
}: DefineVueRenderOptions = {}) => {
  return defineRender(async (context, component, props) => {
    const { recovering, container } = context;

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

        const mergedProps = stateContent
          ? Object.assign({}, stateContent, props)
          : props;

        let vNode: ReactNode;
        if (
          typeof component === "function" &&
          component.constructor.name === "AsyncFunction"
        ) {
          // experimental
          vNode = (await component(mergedProps)) as ReactNode;
        } else {
          vNode = createElement(
            component,
            mergedProps as Attributes
          ) as ReactNode;
        }

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

export const render = defineReactRender();
