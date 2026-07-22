import type { WebWidgetRendererOptions } from '@web-widget/web-widget';
import type {
  ExtractWidgetProps,
  WidgetContainerOptions,
  WidgetContainerProps,
  WidgetHostProps,
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
  T & WidgetHostProps & { widget?: Vue2WidgetContainerProps }
>;

/**
 * Extract the props type `P` from a widget module's default export.
 * Vue2's type system is weaker, so extraction is best-effort.
 */
type WebWidgetRenderer = InstanceType<typeof WebWidgetRenderer>;

type RenderChildren = (children: any[]) => Promise<string>;

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

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

export type Vue2WidgetContainerProps = DistributiveOmit<
  WidgetContainerProps,
  'fallback'
>;

/**
 * Container function (WidgetAdapter protocol).
 *
 * Wraps a widget module loader into a Vue2 component with best-effort
 * props type inference from the source module's default export.
 */
export interface Vue2WidgetFactory {
  <M>(
    loader: () => Promise<M>,
    options?: WidgetContainerOptions
  ): VueWidgetComponent<ExtractWidgetProps<M>>;
  <Props>(
    loader: WidgetModuleLoader,
    options?: WidgetContainerOptions
  ): VueWidgetComponent<Props>;
}

export function createWidgetAdapter(
  renderChildren?: RenderChildren
): Vue2WidgetFactory {
  return ((
    loader: WidgetModuleLoader,
    options: WebWidgetRendererOptions = {}
  ) => {
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
        const lightChildrenHTML = renderChildren
          ? await renderChildren((this as any).$lightChildren)
          : '';
        const widget = (this as any).$widget as WebWidgetRenderer;
        (this as any).$innerHTML = await widget.renderInnerHTMLToString({
          children: lightChildrenHTML,
        });
      },
      setup(props, { slots }) {
        if (props.widget && 'fallback' in props.widget) {
          throw new TypeError(
            `fallback is not supported in Vue2 (no Suspense).`
          );
        }

        const { id, loading = options.loading } = props.widget;
        const renderOptions = {
          ...options,
          clientOnly: props.widget.clientOnly,
          id,
          loading: loading ?? options.loading,
          serverOnly: props.widget.serverOnly,
        };

        const attrs = { ...useAttrs() };
        const slot = typeof attrs.slot === 'string' ? attrs.slot : undefined;
        delete attrs.slot;
        const rendererOptions = {
          ...renderOptions,
          data: attrs as WebWidgetRendererOptions['data'],
          root: options.root,
          slot,
        };
        const widget = new WebWidgetRenderer(loader, rendererOptions);
        const lightChildren = Object.entries(slots).flatMap(([name, render]) =>
          render
            ? render().map((node: any) => {
                if (name !== 'default') {
                  node.data ??= {};
                  node.data.attrs ??= {};
                  node.data.attrs.slot ??= name;
                }
                return node;
              })
            : []
        );

        const instance = getCurrentInstance()!;
        (instance.proxy as any).$widget = widget;
        (instance.proxy as any).$lightChildren = lightChildren;

        return () => {
          const activeWidget = (instance.proxy as any)
            .$widget as WebWidgetRenderer;
          const innerHTML = (instance.proxy as any).$innerHTML;
          const children = renderChildren
            ? undefined
            : lightChildren.length
              ? lightChildren
              : undefined;
          return h(
            activeWidget.localName,
            {
              attrs: activeWidget.attributes,
              ...(innerHTML !== undefined ? { domProps: { innerHTML } } : null),
            },
            children
          );
        };
      },
    });
  }) as Vue2WidgetFactory;
}
