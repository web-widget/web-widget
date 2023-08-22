import type { Loader, RenderOptions } from "@web-widget/web-widget/server";
import { renderToJson } from "@web-widget/web-widget/server";
import { h, defineComponent, Suspense } from "vue";
import type { VNode, PropType } from "vue";

export const __ENV__ = {
  server: true,
};

export const WebWidget = /*#__PURE__*/ defineComponent({
  name: "WebWidget",
  props: {
    base: {
      type: String,
    },
    data: {
      type: Object as PropType<RenderOptions["data"]>,
      default: {},
    },
    import: {
      type: String,
    },
    loader /**/: {
      type: Function as PropType<Loader>,
      required: true,
    },
    loading: {
      type: String,
    },
    name: {
      type: String,
    },
    recovering: {
      type: Boolean,
    },
    renderTarget: {
      type: String as PropType<"light" | "shadow">,
      default: "light",
    },
  },
  async setup({ loader, ...props }, { slots }) {
    if (props.recovering && !loader) {
      throw new TypeError(`Missing loader.`);
    }

    if (Object.keys(slots).length > 0) {
      throw new TypeError(`No support slot.`);
    }

    // TODO Render slot.default
    const children = "";

    if (__ENV__.server) {
      const [tag, attrs, innerHTML] = await renderToJson(loader as Loader, {
        ...props,
        children,
      });
      return () =>
        h(tag, {
          ...attrs,
          innerHTML,
        });
    } else {
      console.warn(`Client components are experimental.`);

      await customElements.whenDefined("web-widget");
      const element = Object.assign(
        document.createElement("web-widget"),
        props
      );
      // @ts-ignore
      await element.bootstrap();

      return () =>
        h("web-widget", {
          ...props, // TODO 检查 Vue 是否正确处理了 Boolean 类型
          innerHTML: children,
        });
    }
  },
});

export interface DefineWebWidgetOptions {
  base?: string;
  import?: string;
  loading?: string;
  name?: string;
  recovering?: boolean;
  renderTarget?: "light" | "shadow";
}

export function defineWebWidget(
  loader: Loader,
  options: DefineWebWidgetOptions
) {
  options.renderTarget = "light"; // TODO shadow
  return /*#__PURE__*/ defineComponent({
    name: "WebWidgetSuspense",
    props: {
      clientOnly: {
        type: Boolean,
        default: !options.recovering,
      },
      fallback: {
        type: Object,
        required: false,
      },
    },
    setup({ clientOnly, fallback, ...data }, { slots }) {
      return () =>
        h(
          Suspense,
          {},
          {
            default: h(
              WebWidget,
              {
                ...options,
                loader,
                data: data as RenderOptions["data"],
                recovering: !clientOnly,
              },
              slots
            ),
            fallback: fallback as VNode,
          }
        );
    },
  });
}
