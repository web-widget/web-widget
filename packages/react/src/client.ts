import { __ENV__ } from "./web-widget";
import { createElement } from "react";
import type { Attributes, ReactNode } from "react";
import type { Root } from "react-dom/client";
import { createRoot, hydrateRoot } from "react-dom/client";
import { defineRender } from "@web-widget/schema/client-helpers";
import type { DefineVueRenderOptions } from "./types";

export * from "@web-widget/schema/server-helpers";
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
        const shell =
          (context.recovering &&
            context.container.querySelector("[webwidgetshell]")) ||
          context.container;
        const state = context.recovering
          ? (context.container.querySelector(
              "[webwidgetstate]"
            ) as HTMLScriptElement)
          : null;
        const stateContent =
          context.recovering && state
            ? JSON.parse(state.textContent as string)
            : onPrefetchData
            ? await onPrefetchData(context, component, props)
            : undefined;
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
          root = hydrateRoot(shell as Element, vNode);
        } else {
          root = createRoot(shell);
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
