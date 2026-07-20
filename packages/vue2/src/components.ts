import type { WebWidgetRendererOptions } from '@web-widget/web-widget';
import type {
  ExtractWidgetProps,
  WidgetContainerOptions,
  WidgetContainerProps,
  WidgetModuleLoader,
} from '@web-widget/schema';
import { WebWidgetRenderer } from '@web-widget/web-widget';
import Vue, { h, defineComponent, useAttrs, getCurrentInstance } from 'vue';
import type { DefineComponent, PropType } from 'vue';
export type { WidgetContainerOptions } from '@web-widget/schema';

export { asReactWidget, toReact } from './as-react-widget';

/**
 * A Vue2 component wrapping a widget, with props `T` plus container config.
 */
export type VueWidgetComponent<T = unknown> = DefineComponent<
  T & { widget?: Vue2WidgetContainerProps }
>;

/**
 * Extract the props type `P` from a widget module's default export.
 * Vue2's type system is weaker, so extraction is best-effort.
 */
type WebWidgetRenderer = InstanceType<typeof WebWidgetRenderer>;

// Lazy-init global Vue config (only once, on first widget call).
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

export type Vue2WidgetContainerProps = Omit<WidgetContainerProps, 'fallback'>;

/**
 * Container function (WidgetAdapter protocol).
 *
 * Wraps a widget module loader into a Vue2 component with best-effort
 * props type inference from the source module's default export.
 */
export function widget<M>(
  loader: () => Promise<M>,
  options?: WidgetContainerOptions
): VueWidgetComponent<ExtractWidgetProps<M>>;
export function widget<Props>(
  loader: WidgetModuleLoader,
  options?: WidgetContainerOptions
): VueWidgetComponent<Props>;
export function widget(
  loader: WidgetModuleLoader,
  options: WebWidgetRendererOptions = {}
) {
  if (!loader) {
    throw new TypeError(`Missing loader.`);
  }

  ensureGlobalVueConfig();

  return defineComponent({
    name: 'VueWidget',
    inheritAttrs: false,
    props: {
      widget: {
        type: Object as PropType<Vue2WidgetContainerProps>,
        default: () => ({}),
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

      if (props.widget && 'fallback' in props.widget) {
        throw new TypeError(`fallback is not supported in Vue2 (no Suspense).`);
      }

      const {
        id,
        loading = options.loading,
        serverOnly,
        clientOnly,
      } = props.widget;
      const renderOptions = {
        id,
        loading: loading ?? options.loading,
        renderStage: serverOnly
          ? ('server' as const)
          : clientOnly
            ? ('client' as const)
            : options.renderStage,
      };

      const data = useAttrs() as WebWidgetRendererOptions['data'];
      const widget = new WebWidgetRenderer(loader, {
        ...options,
        data,
        ...renderOptions,
        renderTarget: options.renderTarget,
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
  }) as unknown as VueWidgetComponent<any>;
}
