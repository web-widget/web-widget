import type {
  WebWidgetRendererInterface,
  WebWidgetRendererOptions,
} from '@web-widget/web-widget';
import type {
  ExtractWidgetProps,
  WidgetContainerOptions,
  WidgetContainerProps,
  WidgetHostProps,
  WidgetModuleLoader,
} from '@web-widget/schema';
import { WebWidgetRenderer } from '@web-widget/web-widget';
import {
  h,
  cloneVNode,
  defineComponent,
  Suspense,
  useAttrs,
  getCurrentInstance,
  ref,
  onErrorCaptured,
} from 'vue';
import type { DefineComponent, VNode, PropType, Slots } from 'vue';
export type { WidgetContainerOptions } from '@web-widget/schema';

export { asReactWidget, toReact } from './as-react-widget';

type RenderChildren = (nodes: VNode[], parent: unknown) => Promise<string>;

function renderLightChildren(slots: Readonly<Slots>) {
  return Object.entries(slots).flatMap(([name, render]) =>
    render
      ? render().map((node) =>
          name === 'default' ? node : cloneVNode(node, { slot: name })
        )
      : []
  );
}

/**
 * A Vue component wrapping a widget, with props `T` plus container config.
 */
export type VueWidgetComponent<T = unknown> = DefineComponent<
  T & WidgetHostProps & { widget?: VueWidgetContainerProps }
>;

/**
 * Extract the props type `P` from a widget module's default export.
 *
 * Handles Vue functional components `(props: T) => VNode` and
 * defineComponent results (which expose `$props`). Falls back to
 * `unknown` for unrecognized component types.
 */
const ServerWebWidget = /*#__PURE__*/ defineComponent({
  name: 'ServerWebWidget',
  props: {
    errorFallback: {
      type: Object as PropType<VNode>,
      default: null,
    },
    renderer: {
      type: Object as PropType<WebWidgetRendererInterface>,
      required: true,
    },
    renderChildren: {
      type: Function as PropType<RenderChildren>,
      required: true,
    },
  },
  async setup({ renderer, errorFallback, renderChildren }, { slots }) {
    const parent = getCurrentInstance()!;
    const children = Object.keys(slots).length
      ? await renderChildren(renderLightChildren(slots), parent)
      : '';

    const tag = renderer.localName;
    const attrs = renderer.attributes;

    // Catch render errors and resolve with the Error instead of rejecting.
    // In the islands architecture there is no client-side retry — a rejected
    // promise inside Suspense would leave the pending fallback forever.
    // By resolving with the Error, the render function can render the error
    // UI without the framework abandoning the subtree.
    const innerHTML = await renderer
      .renderInnerHTMLToString({ children })
      .catch((err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('[VueWidget] Rendering error:', error);
        return error;
      });

    // Widget rendering failed — render error UI instead of throwing.
    if (innerHTML instanceof Error) {
      return () => errorFallback;
    }

    return () => h(tag, { ...attrs, innerHTML });
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
 * import { widget } from '@web-widget/vue/adapter';
 *
 * const Counter = widget(() => import('./Counter@widget.vue'));
 * //    ^? VueWidgetComponent<{ count: number }>
 * ```
 */
export interface VueWidgetFactory {
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
): VueWidgetFactory {
  return ((
    loader: WidgetModuleLoader,
    options: WebWidgetRendererOptions = {}
  ) =>
    defineComponent({
      name: 'VueWidget',
      inheritAttrs: false,
      props: {
        widget: {
          type: Object as PropType<VueWidgetContainerProps>,
          default: () => ({}),
        },
      },
      setup({ widget }, { slots }) {
        const { fallback, id, loading = options.loading, clientOnly } = widget;
        const { pendingFallback, errorFallback } = resolveFallback(fallback);
        const renderOptions = {
          ...options,
          clientOnly: widget.clientOnly,
          id,
          loading: loading ?? options.loading,
          serverOnly: widget.serverOnly,
        };
        const attrs = { ...useAttrs() };
        const slot = typeof attrs.slot === 'string' ? attrs.slot : undefined;
        delete attrs.slot;
        const data = attrs as WebWidgetRendererOptions['data'];
        const renderer = new WebWidgetRenderer(loader, {
          ...renderOptions,
          data,
          slot,
        });

        if (renderer.opaqueInnerHTML !== undefined) {
          return () => {
            const lightChildren = Object.keys(slots).length
              ? renderLightChildren(slots)
              : [];
            return h(
              renderer.localName,
              {
                ...renderer.attributes,
                ...(lightChildren.length === 0
                  ? { innerHTML: renderer.opaqueInnerHTML }
                  : null),
              },
              lightChildren.length ? lightChildren : undefined
            );
          };
        }

        if (clientOnly && pendingFallback) {
          return () =>
            h(
              renderer.localName,
              renderer.attributes,
              h(
                renderer.pendingBoundary.localName,
                {
                  'aria-busy': renderer.pendingBoundary.ariaBusy,
                  slot: renderer.pendingBoundary.slot,
                  style: { display: renderer.pendingBoundary.display },
                },
                pendingFallback
              )
            );
        }

        if (!renderChildren) {
          throw new TypeError('Missing server children renderer.');
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
                ServerWebWidget,
                {
                  errorFallback,
                  renderChildren,
                  renderer,
                },
                slots
              ),
              fallback: pendingFallback,
            }
          );
        };
      },
    })) as unknown as VueWidgetFactory;
}
