import type { Loader, WebWidgetRendererOptions } from '@web-widget/web-widget';
import { WebWidgetRenderer } from '@web-widget/web-widget';
import { h, defineComponent, Suspense, useAttrs } from 'vue';
import type { VNode, PropType, ComponentPublicInstance, Component } from 'vue';
import { IS_CLIENT } from '@web-widget/helpers/env';
import type { ReactWidgetComponent } from '@web-widget/react/runtime';

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

    return () => {
      const nodeProps = {
        ...attrs,
        ...(IS_CLIENT ? { '^data': data } : { data }),
        ...(!IS_CLIENT ? { innerHTML } : null),
      };
      return h(tag, nodeProps);
    };
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
 * Container function (WebWidgetAdapter protocol).
 * Alias of `defineWebWidget` — wraps a generic widget module as a Vue component.
 */
export const container = defineWebWidget;

/**
 * Adapt Vue component types to React widget component types.
 *
 * This is a type-level cast only — the actual cross-framework rendering
 * is handled by the `@widget` system. Use this when importing a Vue
 * widget (e.g. `Counter@widget.vue`) into a React/JSX file so that
 * TypeScript treats it as a React component.
 */
export /*#__PURE__*/ function asReactWidget<T>(component: Component<T>) {
  return component as unknown as ReactWidgetComponent<
    Omit<T, keyof ComponentPublicInstance | '$route' | '$router'>
  >;
}

/** @deprecated Use `asReactWidget` instead. */
export const toReact = asReactWidget;
