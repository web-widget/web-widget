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

export type Vue2WidgetContainerProps = Omit<WidgetContainerProps, 'fallback'>;

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
        const widget = (this as any).$createWidget(lightChildrenHTML);
        (this as any).$widget = widget;
        (this as any).$innerHTML = await widget.renderInnerHTMLToString();
      },
      setup(props, { slots }) {
        if (props.widget && 'fallback' in props.widget) {
          throw new TypeError(
            `fallback is not supported in Vue2 (no Suspense).`
          );
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
        const rendererOptions = {
          ...options,
          data,
          ...renderOptions,
          renderTarget: options.renderTarget,
        };
        const createWidget = (children = '') =>
          new WebWidgetRenderer(loader, {
            ...rendererOptions,
            children,
            id: renderOptions.id,
          });
        const widget = createWidget();
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
        (instance.proxy as any).$createWidget = createWidget;
        (instance.proxy as any).$lightChildren = lightChildren;

        return () => {
          const activeWidget = (instance.proxy as any)
            .$widget as WebWidgetRenderer;
          const innerHTML = (instance.proxy as any).$innerHTML;
          return h(
            activeWidget.localName,
            {
              attrs: activeWidget.attributes,
              ...(renderChildren ? { domProps: { innerHTML } } : null),
            },
            renderChildren ? undefined : lightChildren
          );
        };
      },
    });
  }) as Vue2WidgetFactory;
}
