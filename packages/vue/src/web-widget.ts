import type { Loader, WebWidgetContainerProps } from "@web-widget/web-widget";
import { parse } from "@web-widget/web-widget";
import { h, defineComponent, Suspense } from "vue";
import type { VNode, PropType } from "vue";

export const __ENV__ = {
  server: true,
};

export const WebWidget = /*#__PURE__*/ defineComponent({
  name: "WebWidget",
  props: {
    base: {
      type: String as PropType<WebWidgetContainerProps["base"]>,
    },
    data: {
      type: Object as PropType<WebWidgetContainerProps["data"]>,
      default: {},
    },
    import: {
      type: String as PropType<WebWidgetContainerProps["import"]>,
    },
    inactive: {
      type: Boolean as PropType<WebWidgetContainerProps["inactive"]>,
    },
    loader /**/: {
      type: Function as PropType<Loader>,
      required: true,
    },
    loading: {
      type: String as PropType<WebWidgetContainerProps["loading"]>,
    },
    name: {
      type: String as PropType<WebWidgetContainerProps["name"]>,
    },
    renderStage: {
      type: String as PropType<WebWidgetContainerProps["renderStage"]>,
    },
    renderTarget: {
      type: String as PropType<WebWidgetContainerProps["renderTarget"]>,
      default: "light",
    },
  },
  async setup({ loader, ...props }, { slots }) {
    if (!loader) {
      throw new TypeError(`Missing loader.`);
    }

    if (Object.keys(slots).length > 0) {
      throw new TypeError(`No support slot.`);
    }

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

    return () =>
      h(tag, {
        ...attrs,
        innerHTML,
      });
  },
});

export interface DefineWebWidgetOptions {
  base?: WebWidgetContainerProps["base"];
  import?: WebWidgetContainerProps["import"];
  loading?: WebWidgetContainerProps["loading"];
  name?: WebWidgetContainerProps["name"];
  renderStage?: WebWidgetContainerProps["renderStage"];
  renderTarget?: WebWidgetContainerProps["renderTarget"];
}

export /*#__PURE__*/ function defineWebWidget(
  loader: Loader,
  options: DefineWebWidgetOptions
) {
  options.renderTarget = "light"; // TODO shadow
  return /*#__PURE__*/ defineComponent({
    name: "WebWidgetSuspense",
    props: {
      renderStage: {
        type: String as PropType<WebWidgetContainerProps["renderStage"]>,
        default: options.renderStage,
      },
      fallback: {
        type: Object as PropType<VNode>,
      },
    },
    setup({ renderStage, fallback, ...data }, { slots }) {
      return () =>
        h(
          Suspense,
          {},
          {
            default: h(
              WebWidget,
              {
                ...options,
                data: data as WebWidgetContainerProps["data"],
                loader,
                renderStage,
              },
              slots
            ),
            fallback,
          }
        );
    },
  });
}
