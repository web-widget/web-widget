import type { Loader, WebWidgetRendererOptions } from "@web-widget/web-widget";
import { WebWidgetRenderer } from "@web-widget/web-widget";
import {
  h,
  defineComponent,
  Suspense,
  useAttrs,
  // onServerPrefetch,
  // getCurrentInstance,
} from "vue";
import type { VNode, PropType } from "vue";
import { IS_BROWSER } from "@web-widget/schema/helpers";

export const WebWidget = /*#__PURE__*/ defineComponent({
  name: "WebWidgetRoot",
  props: {
    base: {
      type: String as PropType<WebWidgetRendererOptions["base"]>,
    },
    data: {
      type: Object as PropType<WebWidgetRendererOptions["data"]>,
      default: {},
    },
    import: {
      type: String as PropType<WebWidgetRendererOptions["import"]>,
    },
    inactive: {
      type: Boolean as PropType<WebWidgetRendererOptions["inactive"]>,
      // NOTE: If the default value is not set, it will be false here.
      default: undefined,
    },
    loader /**/: {
      type: Function as PropType<Loader>,
      required: true,
    },
    loading: {
      type: String as PropType<WebWidgetRendererOptions["loading"]>,
    },
    meta: {
      type: Object as PropType<WebWidgetRendererOptions["meta"]>,
    },
    name: {
      type: String as PropType<WebWidgetRendererOptions["name"]>,
    },
    renderStage: {
      type: String as PropType<WebWidgetRendererOptions["renderStage"]>,
    },
    renderTarget: {
      type: String as PropType<WebWidgetRendererOptions["renderTarget"]>,
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

    const widget = new WebWidgetRenderer(loader as Loader, {
      ...props,
      // TODO slots.default
      children: "",
    });
    const tag = widget.localName;
    const attrs = widget.attributes;
    const innerHTML = await widget.renderInnerHTMLToString();

    if (IS_BROWSER) {
      await customElements.whenDefined(tag);
      // let element = document.createElement(tag);
      // Object.entries(attrs).forEach(([name, value]) => {
      //   element.setAttribute(name, value);
      // });
      // // @ts-ignore
      // await element.bootstrap();
      // // @ts-ignore
      // element = null;
    }

    const data = attrs.data;
    delete attrs.data;

    return () =>
      h(tag, {
        ...attrs,
        // NOTE: Use attr instead of props.
        ...(IS_BROWSER ? { "^data": data } : { data }),
        innerHTML,
      });
  },
});

export interface DefineWebWidgetOptions {
  base?: WebWidgetRendererOptions["base"];
  import?: WebWidgetRendererOptions["import"];
  loading?: WebWidgetRendererOptions["loading"];
  name?: WebWidgetRendererOptions["name"];
  renderStage?: WebWidgetRendererOptions["renderStage"];
  renderTarget?: WebWidgetRendererOptions["renderTarget"];
}

export /*#__PURE__*/ function defineWebWidget(
  loader: Loader,
  options: DefineWebWidgetOptions
) {
  return defineComponent({
    name: "WebWidgetSuspense",
    inheritAttrs: false,
    props: {
      fallback: {
        type: Object as PropType<VNode>,
      },
      experimental_loading: {
        type: String as PropType<WebWidgetRendererOptions["loading"]>,
        default: options.loading ?? "lazy",
      },
      renderStage: {
        type: String as PropType<WebWidgetRendererOptions["renderStage"]>,
        default: options.renderStage,
      },
      experimental_renderTarget: {
        type: String as PropType<WebWidgetRendererOptions["renderTarget"]>,
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
      const data = useAttrs() as WebWidgetRendererOptions["data"];

      return () =>
        h(
          Suspense,
          {},
          {
            default: h(
              WebWidget,
              {
                ...options,
                data,
                loader,
                loading: experimental_loading,
                renderStage,
                renderTarget: experimental_renderTarget,
              },
              slots
            ),
            fallback,
          }
        );
    },
  });
}
