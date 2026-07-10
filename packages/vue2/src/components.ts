import type { Loader, WebWidgetRendererOptions } from '@web-widget/web-widget';
import { WebWidgetRenderer } from '@web-widget/web-widget';
import Vue, { h, defineComponent, useAttrs, getCurrentInstance } from 'vue';
import type { Component, PropType } from 'vue';

export { asReactWidget, toReact } from './as-react-widget';

type WebWidgetRenderer = InstanceType<typeof WebWidgetRenderer>;

// Lazy-init global Vue config (only once, on first defineWebWidget call).
let globalConfigInitialized = false;
function ensureGlobalVueConfig() {
  if (globalConfigInitialized) return;
  globalConfigInitialized = true;

  Vue.config.ignoredElements = ['web-widget'];

  // The thrown promise is not necessarily a real error,
  // it will be handled by the web widget container.
  // @link ../lifecycle-cache/src/provider.ts#cacheProviderIsLoading
  const prevWarnHandler = Vue.config.warnHandler;
  Vue.config.warnHandler = (msg, _vm, trace) => {
    if (msg.includes(`[object Promise]`)) {
      return;
    }
    if (prevWarnHandler) {
      prevWarnHandler.call(null, msg, _vm, trace);
    } else {
      console.error('[Vue warn]: '.concat(msg).concat(trace));
    }
  };
}

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

  ensureGlobalVueConfig();

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
 * Container function (WebWidgetAdapter protocol).
 * Alias of `defineWebWidget` — wraps a generic widget module as a Vue2 component.
 */
export const container = defineWebWidget;
