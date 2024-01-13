import {
  defineRender,
  getComponentDescriptor,
} from "@web-widget/schema/client-helpers";
import Vue from "vue";
import type { CreateVueRenderOptions } from "./types";

export * from "@web-widget/schema/client-helpers";
export { useWidgetSyncState as useWidgetState } from "@web-widget/schema/client-helpers";
export * from "./components";

export const createVueRender = ({
  onBeforeCreateApp = async () => ({}),
  onCreatedApp = async () => {},
  onPrefetchData,
}: CreateVueRenderOptions = {}) => {
  return defineRender(async (context) => {
    const componentDescriptor = getComponentDescriptor(context);
    const { component, props } = componentDescriptor;
    const container = context.container as Element;

    if (!container) {
      throw new Error(`Container required.`);
    }

    if (component.__name) {
      // NOTE: Avoid vue warnings: `[Vue warn]: Invalid component name ...`
      component.__name = component.__name.replace("@", ".");
    }

    let app: Vue | null;

    return {
      async mount() {
        let element: Element = container;
        let mergedProps: Record<string, any> = props as any;

        if (context.recovering) {
          const vue2ssrAttrSelector = `[data-server-rendered="true"]`;
          const ssrRoot =
            container.querySelector(vue2ssrAttrSelector) ||
            container.firstElementChild;
          const state = container.querySelector(
            "script[as=state]"
          ) as HTMLScriptElement;
          const stateContent = state
            ? JSON.parse(state.textContent as string)
            : onPrefetchData
            ? await onPrefetchData(context, component, props)
            : undefined;

          if (!ssrRoot) {
            throw new Error(
              `No element found for hydration: ${vue2ssrAttrSelector}`
            );
          }

          element = ssrRoot;
          mergedProps = stateContent
            ? Object.assign(stateContent, props)
            : props;
        }

        app = new Vue({
          render(h) {
            return h(component, {
              props: mergedProps,
            });
          },
          ...(await onBeforeCreateApp(context, component, mergedProps)),
        });

        await onCreatedApp(app, context, component, mergedProps);

        if (context.recovering) {
          app.$mount(element, context.recovering);
        } else {
          container.appendChild(app.$mount().$el);
        }
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

/**@deprecated Please use `createVueRender` instead.*/
export const defineVueRender = createVueRender;

export const render = createVueRender();

export const handler = {
  GET() {
    throw new Error(`Server-side only.`);
  },
};
