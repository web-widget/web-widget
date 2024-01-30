import type { Loader, WebWidgetRendererOptions } from '@web-widget/web-widget';
import { WebWidgetRenderer } from '@web-widget/web-widget';
import { h, defineComponent, useAttrs, getCurrentInstance } from 'vue';
import type { Component, PropType } from 'vue';
import { IS_CLIENT } from '@web-widget/helpers';

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
    name: 'WebWidgetRoot',
    inheritAttrs: false,
    props: {
      fallback: {
        type: Object as PropType<Component>,
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
    async serverPrefetch() {
      const widget = (this as any).$widget as WebWidgetRenderer;
      const innerHTML = await widget.renderInnerHTMLToString();
      (this as any).$innerHTML = innerHTML;
    },
    // async mounted() {
    //   if (!(this as any).$innerHTML) {
    //     const widget = (this as any).$widget as WebWidgetRenderer;
    //     const innerHTML = await widget.renderInnerHTMLToString();
    //     (this as any).$innerHTML = innerHTML;
    //   }
    // },
    setup(
      {
        fallback,
        experimental_loading,
        renderStage,
        experimental_renderTarget,
      },
      { slots }
    ) {
      if (!loader) {
        throw new TypeError(`Missing loader.`);
      }

      if (Object.keys(slots).length > 0) {
        throw new TypeError(`No support slot.`);
      }

      // eslint-disable-next-line react-hooks/rules-of-hooks
      const data = useAttrs() as WebWidgetRendererOptions['data'];
      const widget = new WebWidgetRenderer(loader as Loader, {
        ...options,
        data,
        loading: experimental_loading,
        renderStage,
        renderTarget: experimental_renderTarget,
      });
      const instance = getCurrentInstance()!;
      (instance.proxy as any).$widget = widget;

      if (IS_CLIENT) {
        // await customElements.whenDefined(tag);
        // let element = document.createElement(tag);
        // Object.entries(attrs).forEach(([name, value]) => {
        //   element.setAttribute(name, value);
        // });
        // // @ts-ignore
        // await element.bootstrap();
        // // @ts-ignore
        // element = null;
      }

      return () => {
        const innerHTML = (instance.proxy as any).$innerHTML;
        return h(widget.localName, {
          attrs: widget.attributes,
          domProps: {
            innerHTML,
          },
        });
      };
    },
  });
}
