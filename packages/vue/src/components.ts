import type { Loader, WebWidgetRendererOptions } from '@web-widget/web-widget';
import { WebWidgetRenderer } from '@web-widget/web-widget';
import { h, defineComponent, Suspense, useAttrs } from 'vue';
import type { VNode, PropType, ComponentPublicInstance, Component } from 'vue';
import { IS_CLIENT } from '@web-widget/helpers/env';
import type { ReactWidgetComponent } from '@web-widget/react';

const WebWidget = /*#__PURE__*/ defineComponent({
  name: 'WebWidgetRoot',
  props: {
    base: {
      type: String as PropType<WebWidgetRendererOptions['base']>,
    },
    data: {
      type: Object as PropType<WebWidgetRendererOptions['data']>,
      default: () => ({}),
    },
    import: {
      type: String as PropType<WebWidgetRendererOptions['import']>,
    },
    inactive: {
      type: Boolean as PropType<WebWidgetRendererOptions['inactive']>,
      default: false,
    },
    loader: {
      type: Function as PropType<Loader>,
      required: true,
    },
    loading: {
      type: String as PropType<WebWidgetRendererOptions['loading']>,
    },
    meta: {
      type: Object as PropType<WebWidgetRendererOptions['meta']>,
    },
    name: {
      type: String as PropType<WebWidgetRendererOptions['name']>,
    },
    renderStage: {
      type: String as PropType<WebWidgetRendererOptions['renderStage']>,
    },
    renderTarget: {
      type: String as PropType<WebWidgetRendererOptions['renderTarget']>,
      default: 'light',
    },
  },
  async setup({ loader, ...props }, { slots }) {
    if (!loader) {
      throw new TypeError(`Missing loader.`);
    }

    if (Object.keys(slots).length > 0) {
      throw new TypeError(`Slot not supported.`);
    }

    const widget = new WebWidgetRenderer(loader as Loader, {
      ...props,
      children: '',
    });
    const tag = widget.localName;
    const attrs = widget.attributes;
    const innerHTML = await widget.renderInnerHTMLToString();

    if (IS_CLIENT) {
      await customElements.whenDefined(tag);
    }

    const data = attrs.data;
    delete attrs.data;

    return () =>
      h(tag, {
        ...attrs,
        ...(IS_CLIENT ? { '^data': data } : { data }),
        innerHTML,
      });
  },
});

export interface DefineWebWidgetOptions {
  base?: WebWidgetRendererOptions['base'];
  import?: WebWidgetRendererOptions['import'];
  loading?: WebWidgetRendererOptions['loading'];
  name?: WebWidgetRendererOptions['name'];
  renderStage?: WebWidgetRendererOptions['renderStage'];
  renderTarget?: WebWidgetRendererOptions['renderTarget'];
}

export /*#__PURE__*/ function defineWebWidget(
  loader: Loader,
  options: DefineWebWidgetOptions
) {
  return defineComponent({
    name: 'WebWidgetSuspense',
    inheritAttrs: false,
    props: {
      fallback: {
        type: Object as PropType<VNode>,
      },
      experimental_loading: {
        type: String as PropType<WebWidgetRendererOptions['loading']>,
        default: options.loading ?? 'lazy',
      },
      renderStage: {
        type: String as PropType<WebWidgetRendererOptions['renderStage']>,
        default: options.renderStage,
      },
      experimental_renderTarget: {
        type: String as PropType<WebWidgetRendererOptions['renderTarget']>,
        default: options.renderTarget ?? 'light',
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
      const data = useAttrs() as WebWidgetRendererOptions['data'];

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

/**
 * Convert Vue component types to React component types.
 */
export /*#__PURE__*/ function toReact<T>(component: Component<T>) {
  return component as unknown as ReactWidgetComponent<
    Omit<T, keyof ComponentPublicInstance | '$route' | '$router'>
  >;
}
