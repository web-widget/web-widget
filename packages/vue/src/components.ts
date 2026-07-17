import type { WebWidgetRendererOptions } from '@web-widget/web-widget';
import type {
  ExtractWidgetProps,
  WidgetContainerOptions,
  WidgetContainerProps,
  WidgetModuleLoader,
} from '@web-widget/schema';
import { WebWidgetRenderer } from '@web-widget/web-widget';
import {
  h,
  defineComponent,
  Suspense,
  useAttrs,
  ref,
  onErrorCaptured,
} from 'vue';
import type { DefineComponent, VNode, PropType } from 'vue';
import { IS_CLIENT } from '@web-widget/helpers/env';
export type { WidgetContainerOptions } from '@web-widget/schema';

export { asReactWidget, toReact } from './as-react-widget';

type RendererProp<K extends keyof WebWidgetRendererOptions> = PropType<
  WebWidgetRendererOptions[K]
>;

/**
 * A Vue component wrapping a widget, with props `T` plus container config.
 */
export type VueWidgetComponent<T = unknown> = DefineComponent<
  T & { widget?: VueWidgetContainerProps }
>;

/**
 * Extract the props type `P` from a widget module's default export.
 *
 * Handles Vue functional components `(props: T) => VNode` and
 * defineComponent results (which expose `$props`). Falls back to
 * `unknown` for unrecognized component types.
 */
const WebWidget = /*#__PURE__*/ defineComponent({
  name: 'WebWidgetRoot',
  props: {
    base: {
      type: String as RendererProp<'base'>,
    },
    data: {
      type: Object as RendererProp<'data'>,
      default: () => ({}),
    },
    devStyles: {
      type: Array as RendererProp<'devStyles'>,
    },
    errorFallback: {
      type: Object as PropType<VNode>,
      default: null,
    },
    import: {
      type: String as RendererProp<'import'>,
    },
    inactive: {
      type: Boolean as RendererProp<'inactive'>,
      default: false,
    },
    loader: {
      type: Function as PropType<WidgetModuleLoader>,
      required: true,
    },
    loading: {
      type: String as RendererProp<'loading'>,
    },
    meta: {
      type: Object as RendererProp<'meta'>,
    },
    name: {
      type: String as RendererProp<'name'>,
    },
    renderStage: {
      type: String as RendererProp<'renderStage'>,
    },
    renderTarget: {
      type: String as RendererProp<'renderTarget'>,
      default: 'light',
    },
  },
  async setup({ loader, errorFallback, ...props }, { slots }) {
    if (!loader) {
      throw new TypeError(`Missing loader.`);
    }

    if (Object.keys(slots).length > 0) {
      throw new TypeError(`Slot not supported.`);
    }

    const widget = new WebWidgetRenderer(loader, {
      ...props,
      children: '',
    });
    const tag = widget.localName;
    const attrs = widget.attributes;

    // Catch render errors and resolve with the Error instead of rejecting.
    // In the islands architecture there is no client-side retry — a rejected
    // promise inside Suspense would leave the pending fallback forever.
    // By resolving with the Error, the render function can render the error
    // UI without the framework abandoning the subtree.
    const innerHTML = await widget
      .renderInnerHTMLToString()
      .catch((err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('[VueWidget] Rendering error:', error);
        return error;
      });

    // Widget rendering failed — render error UI instead of throwing.
    if (innerHTML instanceof Error) {
      return () => errorFallback;
    }

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

export type VueWidgetContainerProps = WidgetContainerProps<VNode>;

/**
 * Resolve a WidgetFallback into separate pending and error VNodes.
 * - `VNode` — used for both pending and error.
 * - `{ pending?, error? }` — specify independently; `error` defaults to `pending`.
 */
export function resolveFallback(
  fallback: VueWidgetContainerProps['fallback']
): {
  pendingFallback: VNode;
  errorFallback: VNode;
} {
  if (
    fallback !== null &&
    typeof fallback === 'object' &&
    !('__v_isVNode' in fallback) &&
    ('pending' in fallback || 'error' in fallback)
  ) {
    const obj = fallback as { pending?: VNode; error?: VNode };
    return {
      pendingFallback: obj.pending!,
      errorFallback: obj.error ?? obj.pending!,
    };
  }
  return {
    pendingFallback: fallback as VNode,
    errorFallback: fallback as VNode,
  };
}

/**
 * Container function (WidgetAdapter protocol).
 *
 * Wraps a widget module loader into a Vue component with props type
 * inference from the source module's default export.
 *
 * @example
 * ```ts
 * import { container } from '@web-widget/vue/adapter';
 *
 * const Counter = container(() => import('./Counter@widget.vue'));
 * //    ^? VueWidgetComponent<{ count: number }>
 * ```
 */
export function container<M>(
  loader: () => Promise<M>,
  options?: WidgetContainerOptions
): VueWidgetComponent<ExtractWidgetProps<M>>;
export function container<Props>(
  loader: WidgetModuleLoader,
  options?: WidgetContainerOptions
): VueWidgetComponent<Props>;
export function container(
  loader: WidgetModuleLoader,
  options: WebWidgetRendererOptions = {}
) {
  return defineComponent({
    name: 'VueWidget',
    inheritAttrs: false,
    props: {
      widget: {
        type: Object as PropType<VueWidgetContainerProps>,
        default: () => ({}),
      },
    },
    setup({ widget }, { slots }) {
      const {
        fallback,
        loading = options.loading,
        serverOnly,
        clientOnly,
      } = widget;
      const { pendingFallback, errorFallback } = resolveFallback(fallback);
      const renderOptions = {
        loading: loading ?? options.loading,
        renderStage: serverOnly
          ? ('server' as const)
          : clientOnly
            ? ('client' as const)
            : options.renderStage,
      };
      const data = useAttrs() as WebWidgetRendererOptions['data'];

      if (clientOnly && !IS_CLIENT && pendingFallback) {
        const renderer = new WebWidgetRenderer(loader, {
          ...options,
          children: '',
          data,
          ...renderOptions,
          renderTarget: options.renderTarget,
        });
        return () =>
          h(
            renderer.localName,
            renderer.attributes,
            h(
              'div',
              {
                'aria-busy': String(renderer.pendingBoundary.ariaBusy),
                slot: renderer.pendingBoundary.slot,
                style: { display: renderer.pendingBoundary.display },
              },
              pendingFallback
            )
          );
      }

      const error = ref<unknown>(null);
      onErrorCaptured((err) => {
        error.value = err;
        return false;
      });

      return () => {
        if (error.value && errorFallback) {
          return errorFallback;
        }
        return h(
          Suspense,
          {},
          {
            default: h(
              WebWidget,
              {
                ...options,
                data,
                errorFallback,
                loader,
                ...renderOptions,
                renderTarget: options.renderTarget,
              },
              slots
            ),
            fallback: pendingFallback,
          }
        );
      };
    },
  }) as unknown as VueWidgetComponent<any>;
}
