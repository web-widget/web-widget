import type { Loader, WebWidgetRendererOptions } from '@web-widget/web-widget';
import { WebWidgetRenderer } from '@web-widget/web-widget';
import Vue, { h, defineComponent, useAttrs, getCurrentInstance } from 'vue';
import type { DefineComponent, PropType } from 'vue';

export { asReactWidget, toReact } from './as-react-widget';

/**
 * A Vue2 component wrapping a widget, with props `T` plus container config.
 */
export type VueWidgetComponent<T = unknown> = DefineComponent<{
  widget?: WidgetContainerConfig;
}> & { attrs: T };

/**
 * Extract the props type `P` from a widget module's default export.
 * Vue2's type system is weaker, so extraction is best-effort.
 */
type ExtractModuleProps<M> = M extends { default: infer C }
  ? C extends (props: infer P, ...args: any[]) => any
    ? P
    : unknown
  : unknown;

type WebWidgetRenderer = InstanceType<typeof WebWidgetRenderer>;

// Lazy-init global Vue config (only once, on first container call).
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

export interface WidgetContainerConfig {
  /** Client-side module loading strategy */
  loading?: WebWidgetRendererOptions['loading'];
  /** Widget renders only on the server, not mounted on the client. Mutually exclusive with `clientOnly`. */
  serverOnly?: true;
  /** Widget renders only on the client, producing no server HTML. Mutually exclusive with `serverOnly`. */
  clientOnly?: true;
}

/**
 * Container function (WebWidgetAdapter protocol).
 *
 * Wraps a widget module loader into a Vue2 component with best-effort
 * props type inference from the source module's default export.
 */
export function container<M>(
  loader: () => Promise<M>,
  options?: DefineWebWidgetOptions
): VueWidgetComponent<ExtractModuleProps<M>>;
export function container(
  loader: Loader,
  options: DefineWebWidgetOptions = {}
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
        type: Object as PropType<WidgetContainerConfig>,
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
        loading = options.loading ?? 'lazy',
        serverOnly,
        clientOnly,
      } = props.widget;
      const renderStage = serverOnly
        ? 'server'
        : clientOnly
          ? 'client'
          : options.renderStage;

      const data = useAttrs() as WebWidgetRendererOptions['data'];
      const widget = new WebWidgetRenderer(loader, {
        ...options,
        data,
        loading,
        renderStage,
        renderTarget: options.renderTarget ?? 'light',
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
