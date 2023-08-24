import type { Loader, WebWidgetContainerOptions } from "@web-widget/web-widget";
import { parse } from "@web-widget/web-widget";
import { h, defineComponent, defineAsyncComponent } from "vue";
import type { Component, PropType } from "vue";

export const __ENV__ = {
  server: true,
};

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
      type: Function as PropType<Component>,
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

        if (!__ENV__.server) {
          console.warn(`Client components are experimental.`);
          await customElements.whenDefined(tag);
          const element = Object.assign(document.createElement(tag), props);
          // @ts-ignore
          await element.bootstrap();
        }
        return {
          default: defineComponent({
            functional: true,
            render(h) {
              h(tag, {
                attrs: attrs,
                domProps: {
                  innerHTML,
                },
              });
            },
          }),
        };
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
  console.warn(`defineWebWidget of vue2 is an experimental feature.`);

  options.renderTarget = "light"; // TODO shadow
  return /*#__PURE__*/ defineComponent({
    name: "WebWidgetSuspense",
    props: {
      renderStage: {
        type: String as PropType<WebWidgetContainerOptions["renderStage"]>,
        default: options.renderStage,
      },
      fallback: {
        type: Object as PropType<Component>,
      },
    },
    setup({ fallback, renderStage, ...data }, { slots }) {
      return () =>
        h(WebWidget, {
          props: {
            ...options,
            data: data as WebWidgetContainerOptions["data"],
            loader,
            renderStage,

            // -----
            fallback,
          },
          scopedSlots: slots,
        });
    },
  });
}
