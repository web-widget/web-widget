import type { Loader, WebWidgetRendererOptions } from '@web-widget/web-widget';
import { WebWidgetRenderer } from '@web-widget/web-widget';
import { h, defineComponent, Suspense, useAttrs } from 'vue';
import type { VNode, PropType } from 'vue';
import { IS_CLIENT } from '@web-widget/helpers/env';

export { asReactWidget, toReact } from './as-react-widget';

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

export interface WidgetContainerConfig {
  fallback?: VNode;
  loading?: WebWidgetRendererOptions['loading'];
  serverOnly?: true;
  clientOnly?: true;
}

export /*#__PURE__*/ function container(
  loader: Loader,
  options: DefineWebWidgetOptions
) {
  return defineComponent({
    name: 'VueWidget',
    inheritAttrs: false,
    props: {
      widget: {
        type: Object as PropType<WidgetContainerConfig>,
        default: () => ({}),
      },
    },
    setup({ widget }, { slots }) {
      const {
        fallback,
        loading = options.loading ?? 'lazy',
        serverOnly,
        clientOnly,
      } = widget;
      const renderStage = serverOnly
        ? 'server'
        : clientOnly
          ? 'client'
          : options.renderStage;
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
                loading,
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

/**
 * Container function (WebWidgetAdapter protocol).
 * Wraps a generic widget module as a Vue component.
 */
