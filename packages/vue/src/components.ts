import type { WebWidgetRendererOptions } from '@web-widget/web-widget';
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
import type { DefineComponent, VNode, PropType } from 'vue';
export type { WidgetContainerOptions } from '@web-widget/schema';

export { asReactWidget, toReact } from './as-react-widget';

type RendererProp<K extends keyof WebWidgetRendererOptions> = PropType<
  WebWidgetRendererOptions[K]
>;

type RenderChildren = (nodes: VNode[], parent: unknown) => Promise<string>;

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
    id: {
      type: String as RendererProp<'id'>,
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
    root: {
      type: String as RendererProp<'root'>,
      default: 'light',
    },
    renderChildren: {
      type: Function as PropType<RenderChildren>,
    },
    hostSlot: {
      type: String,
    },
  },
  async setup(
    { loader, errorFallback, renderChildren, hostSlot, ...props },
    { slots }
  ) {
    if (!loader) {
      throw new TypeError(`Missing loader.`);
    }

    const renderLightChildren = () =>
      Object.entries(slots).flatMap(([name, render]) =>
        render
          ? render().map((node) =>
              name === 'default' ? node : cloneVNode(node, { slot: name })
            )
          : []
      );
    const parent = getCurrentInstance()!;
    const children =
      renderChildren && Object.keys(slots).length
        ? await renderChildren(renderLightChildren(), parent)
        : '';

    const widget = new WebWidgetRenderer(loader, {
      ...props,
      slot: hostSlot,
    });
    const tag = widget.localName;
    const attrs = widget.attributes;

    // Catch render errors and resolve with the Error instead of rejecting.
    // In the islands architecture there is no client-side retry — a rejected
    // promise inside Suspense would leave the pending fallback forever.
    // By resolving with the Error, the render function can render the error
    // UI without the framework abandoning the subtree.
    const innerHTML = await widget
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

    if (!renderChildren) {
      await customElements.whenDefined(tag);
    }

    const data = attrs.data;
    delete attrs.data;

    return () => {
      const nodeProps = {
        ...attrs,
        ...(!renderChildren ? { '^data': data } : { data }),
        ...(renderChildren ? { innerHTML } : null),
      };
      return h(
        tag,
        nodeProps,
        renderChildren ? undefined : renderLightChildren()
      );
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
        const {
          fallback,
          id,
          loading = options.loading,
          serverOnly,
          clientOnly,
        } = widget;
        const { pendingFallback, errorFallback } = resolveFallback(fallback);
        const renderOptions = {
          id,
          loading: loading ?? options.loading,
          renderStage: serverOnly
            ? ('server' as const)
            : clientOnly
              ? ('client' as const)
              : options.renderStage,
        };
        const attrs = { ...useAttrs() };
        const slot = typeof attrs.slot === 'string' ? attrs.slot : undefined;
        delete attrs.slot;
        const data = attrs as WebWidgetRendererOptions['data'];

        if (clientOnly && renderChildren && pendingFallback) {
          const renderer = new WebWidgetRenderer(loader, {
            ...options,
            data,
            ...renderOptions,
            root: options.root,
            slot,
          });
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
                  hostSlot: slot,
                  renderChildren,
                  ...renderOptions,
                  root: options.root,
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
