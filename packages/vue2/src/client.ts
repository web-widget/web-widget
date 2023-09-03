import Vue from "vue";
import { defineRender as defineRenderHelper } from "@web-widget/schema/client-helpers";
import type { DefineVueRenderOptions } from "./types";

export * from "@web-widget/schema/client-helpers";
export * from "./web-widget";

export const defineVueRender = ({
  onBeforeCreateApp = () => ({}),
  onCreatedApp = () => {},
  onPrefetchData,
}: DefineVueRenderOptions = {}) => {
  return defineRenderHelper(async (context, component, props) => {
    if (!context.container) {
      throw new Error(`Container required.`);
    }

    let app: Vue | null;

    return {
      async mount() {
        const shellTag = "web-widget.shell";
        const vue2rootAttr = "data-vue2root";
        const vue2ssrAttr = "data-server-rendered";
        // NOTE: The "$mount" method of vue2 will replace the container element.
        const shell =
          (context.recovering &&
            context.container.querySelector(shellTag.replace(".", "\\."))) ||
          context.container.appendChild(document.createElement(shellTag));
        const componentRoot = context.recovering
          ? shell.querySelector(`[${vue2rootAttr}]`)
          : null;
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
        shell.removeAttribute(vue2ssrAttr);
        componentRoot?.removeAttribute(vue2rootAttr);
        componentRoot?.setAttribute(vue2ssrAttr, "true");

        const mergedProps = stateContent
          ? Object.assign(stateContent, props)
          : props;

        const vNodeData: Vue.VNodeData = {
          props: mergedProps as Record<string, any>,
        };

        app = new Vue({
          render(h) {
            return h(component, vNodeData);
          },
          ...onBeforeCreateApp(context, component, mergedProps),
        });

        onCreatedApp(app, context, component, mergedProps);

        app.$mount(shell);
      },

      async unmount() {
        app?.$destroy();
        if (context.container instanceof Element) {
          context.container.innerHTML = "";
        }
        app = null;
      },
    };
  });
};

export const render = defineVueRender();
