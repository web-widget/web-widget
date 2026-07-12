import type { Loader, WebWidgetRendererOptions } from '@web-widget/web-widget';
import { WebWidgetRenderer } from '@web-widget/web-widget';
import {
  h,
  defineComponent,
  Suspense,
  useAttrs,
  ref,
  onErrorCaptured,
} from 'vue';
import type { VNode, PropType } from 'vue';
import { IS_CLIENT } from '@web-widget/helpers/env';

export { asReactWidget, toReact } from './as-react-widget';

const WebWidget = /*#__PURE__*/ defineComponent({
  name: 'WebWidgetRoot',
  props: {
    base: {
      type: String as PropType<WebWidgetRendererOptions['base']>,
    },
    data: {
      type: Object as PropType<WebWidgetRendererOptions['data']>,
      default: () => ({}),
    },
    import: {
      type: String as PropType<WebWidgetRendererOptions['import']>,
    },
    inactive: {
      type: Boolean as PropType<WebWidgetRendererOptions['inactive']>,
      default: false,
    },
    loader: {
      type: Function as PropType<Loader>,
      required: true,
    },
    loading: {
      type: String as PropType<WebWidgetRendererOptions['loading']>,
    },
    meta: {
      type: Object as PropType<WebWidgetRendererOptions['meta']>,
    },
    name: {
      type: String as PropType<WebWidgetRendererOptions['name']>,
    },
    renderStage: {
      type: String as PropType<WebWidgetRendererOptions['renderStage']>,
    },
    renderTarget: {
      type: String as PropType<WebWidgetRendererOptions['renderTarget']>,
      default: 'light',
    },
  },
  async setup({ loader, ...props }, { slots }) {
    if (!loader) {
      throw new TypeError(`Missing loader.`);
    }

    if (Object.keys(slots).length > 0) {
      throw new TypeError(`Slot not supported.`);
    }

    const widget = new WebWidgetRenderer(loader as Loader, {
      ...props,
      children: '',
    });
    const tag = widget.localName;
    const attrs = widget.attributes;
    const innerHTML = await widget.renderInnerHTMLToString();

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

export interface DefineWebWidgetOptions {
  base?: WebWidgetRendererOptions['base'];
  import?: WebWidgetRendererOptions['import'];
  loading?: WebWidgetRendererOptions['loading'];
  name?: WebWidgetRendererOptions['name'];
  renderStage?: WebWidgetRendererOptions['renderStage'];
  renderTarget?: WebWidgetRendererOptions['renderTarget'];
}

export type WidgetFallback = VNode | { pending?: VNode; error?: VNode };

/**
 * Resolve a WidgetFallback into separate pending and error VNodes.
 * - `VNode` — used for both pending and error.
 * - `{ pending?, error? }` — specify independently; `error` defaults to `pending`.
 */
export function resolveFallback(fallback: WidgetFallback | undefined): {
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

export interface WidgetContainerConfig {
  /**
   * Fallback UI for loading and error states.
   *
   * Only effective during server-side rendering: loading UI shows while the
   * widget module renders; error UI shows if rendering fails. Both are
   * serialized into the HTML stream — no client-side retry exists in the
   * islands architecture.
   *
   * - `VNode` — used for both pending (Suspense) and error.
   * - `{ pending?, error? }` — specify independently; `error` defaults to `pending`.
   *
   * @example
   * // Simple: same UI for both states
   * <Widget :widget="{ fallback: h(Spinner) }" />
   *
   * // Differentiated: separate pending and error UI
   * <Widget :widget="{ fallback: { pending: h(Spinner), error: h(ErrorUI) } }" />
   */
  fallback?: WidgetFallback;
  /** Client-side module loading strategy: `'lazy'` loads on first render, `'eager'` on module parse, `'idle'` on browser idle. */
  loading?: WebWidgetRendererOptions['loading'];
  /** Widget renders only on the server (SSR), producing static HTML with no client-side mount. Mutually exclusive with `clientOnly`. */
  serverOnly?: true;
  /** Widget renders only on the client, producing no server HTML (empty placeholder until client mount). Mutually exclusive with `serverOnly`. */
  clientOnly?: true;
}

export /*#__PURE__*/ function container(
  loader: Loader,
  options: DefineWebWidgetOptions
) {
  return defineComponent({
    name: 'VueWidget',
    inheritAttrs: false,
    props: {
      widget: {
        type: Object as PropType<WidgetContainerConfig>,
        default: () => ({}),
      },
    },
    setup({ widget }, { slots }) {
      const {
        fallback,
        loading = options.loading ?? 'lazy',
        serverOnly,
        clientOnly,
      } = widget;
      const { pendingFallback, errorFallback } = resolveFallback(fallback);
      const renderStage = serverOnly
        ? 'server'
        : clientOnly
          ? 'client'
          : options.renderStage;
      const data = useAttrs() as WebWidgetRendererOptions['data'];

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
                loader,
                loading,
                renderStage,
                renderTarget: options.renderTarget ?? 'light',
              },
              slots
            ),
            fallback: pendingFallback,
          }
        );
      };
    },
  });
}

/**
 * Container function (WebWidgetAdapter protocol).
 * Wraps a generic widget module as a Vue component.
 */
