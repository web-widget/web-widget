import type { Loader, WebWidgetContainerOptions } from "@web-widget/web-widget";
import { parse } from "@web-widget/web-widget";
import { h, defineComponent, defineAsyncComponent, useAttrs } from "vue";
import type { Component, PropType } from "vue";
import { IS_BROWSER } from "@web-widget/schema/helpers";

export const WebWidget = /*#__PURE__*/ defineComponent({
  name: "WebWidget",
  props: {
    base: {
      type: String as PropType<WebWidgetContainerOptions["base"]>,
    },
    data: {
      type: Object as PropType<WebWidgetContainerOptions["data"]>,
      default: {},
    },
    import: {
      type: String as PropType<WebWidgetContainerOptions["import"]>,
    },
    inactive: {
      type: Boolean as PropType<WebWidgetContainerOptions["inactive"]>,
      // NOTE: If the default value is not set, it will be false here.
      default: undefined,
    },
    loader /**/: {
      type: Function as PropType<Loader>,
      required: true,
    },
    loading: {
      type: String as PropType<WebWidgetContainerOptions["loading"]>,
    },
    meta: {
      type: Object as PropType<WebWidgetContainerOptions["meta"]>,
    },
    name: {
      type: String as PropType<WebWidgetContainerOptions["name"]>,
    },
    renderStage: {
      type: String as PropType<WebWidgetContainerOptions["renderStage"]>,
    },
    renderTarget: {
      type: String as PropType<WebWidgetContainerOptions["renderTarget"]>,
      default: "light",
    },

    // -----
    fallback: {
      type: Object as PropType<Component>,
      // NOTE: If the default value is not set, it will be false here.
      default: undefined,
    },
  },
  setup({ fallback, loader, ...props }, { slots }) {
    if (!loader) {
      throw new TypeError(`Missing loader.`);
    }

    if (Object.keys(slots).length > 0) {
      throw new TypeError(`No support slot.`);
    }

    const AsyncComponent = defineAsyncComponent({
      loader: async () => {
        // TODO Render slot.default
        const children = "";

        const [tag, attrs, innerHTML] = await parse(loader as Loader, {
          ...props,
          children,
        });

        if (IS_BROWSER) {
          console.warn(`Client components are experimental.`);
          await customElements.whenDefined(tag);
          const element = Object.assign(document.createElement(tag), props);
          // @ts-ignore
          await element.bootstrap();
        }
        return defineComponent({
          render(h) {
            return h(tag, {
              attrs: attrs,
              domProps: {
                innerHTML,
              },
            });
          },
        });
      },
      delay: 200,
      timeout: 3000,
      errorComponent: fallback,
      loadingComponent: fallback,
    });

    return () => h(AsyncComponent);
  },
});

export interface DefineWebWidgetOptions {
  base?: WebWidgetContainerOptions["base"];
  import?: WebWidgetContainerOptions["import"];
  loading?: WebWidgetContainerOptions["loading"];
  name?: WebWidgetContainerOptions["name"];
  renderStage?: WebWidgetContainerOptions["renderStage"];
  renderTarget?: WebWidgetContainerOptions["renderTarget"];
}

export /*#__PURE__*/ function defineWebWidget(
  loader: Loader,
  options: DefineWebWidgetOptions
) {
  return defineComponent({
    name: "WebWidgetSuspense",
    props: {
      fallback: {
        type: Object as PropType<Component>,
      },
      experimental_loading: {
        type: String as PropType<WebWidgetContainerOptions["loading"]>,
        default: options.loading ?? "lazy",
      },
      renderStage: {
        type: String as PropType<WebWidgetContainerOptions["renderStage"]>,
        default: options.renderStage,
      },
      experimental_renderTarget: {
        type: String as PropType<WebWidgetContainerOptions["renderTarget"]>,
        default: options.renderTarget ?? "light",
      },
    },
    setup(
      {
        fallback,
        experimental_loading,
        renderStage,
        experimental_renderTarget,
      },
      { slots }
    ) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const data = useAttrs() as WebWidgetContainerOptions["data"];

      return () =>
        h(WebWidget, {
          props: {
            ...options,
            data,
            loader,
            loading: experimental_loading,
            renderStage,
            renderTarget: experimental_renderTarget,

            // -----
            fallback,
          },
          scopedSlots: slots,
        });
    },
  });
}
