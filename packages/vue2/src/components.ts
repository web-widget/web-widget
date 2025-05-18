import type { Loader, WebWidgetRendererOptions } from '@web-widget/web-widget';
import { WebWidgetRenderer } from '@web-widget/web-widget';
import Vue, { h, defineComponent, useAttrs, getCurrentInstance } from 'vue';
import type { Component, ComponentPublicInstance, PropType } from 'vue';
import type { ReactWidgetComponent } from '@web-widget/react';
import { DefaultProps } from 'vue/types/options';

Vue.config.ignoredElements = ['web-widget'];

/**
 * The thrown promise is not necessarily a real error,
 * it will be handled by the web widget container.
 * @link ../lifecycle-cache/src/provider.ts#cacheProviderIsLoading
 */
Vue.config.warnHandler = (msg, _vm, trace) => {
  if (msg.includes(`[object Promise]`)) {
    return;
  }
  console.error('[Vue warn]: '.concat(msg).concat(trace));
};

type WebWidgetRenderer = InstanceType<typeof WebWidgetRenderer>;

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
  if (!loader) {
    throw new TypeError(`Missing loader.`);
  }

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
      (this as any).$innerHTML = await widget.renderInnerHTMLToString();
    },
    setup(props, { slots }) {
      if (Object.keys(slots).length > 0) {
        throw new TypeError(`Slot not supported.`);
      }

      const data = useAttrs() as WebWidgetRendererOptions['data'];
      const widget = new WebWidgetRenderer(loader, {
        ...options,
        data,
        loading: props.experimental_loading,
        renderStage: props.renderStage,
        renderTarget: props.experimental_renderTarget,
      });

      const instance = getCurrentInstance()!;
      (instance.proxy as any).$widget = widget;

      return () => {
        const innerHTML = (instance.proxy as any).$innerHTML;
        return h(widget.localName, {
          attrs: widget.attributes,
          domProps: { innerHTML },
        });
      };
    },
  });
}

/**
 * Convert Vue component types to React component types.
 */
export /*#__PURE__*/ function toReact<T extends DefaultProps>(
  component: Component<never, never, never, T, never>
) {
  return component as unknown as ReactWidgetComponent<
    Omit<T, keyof ComponentPublicInstance | '$route' | '$router'>
  >;
}
