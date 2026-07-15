import type { Loader, WebWidgetRendererOptions } from '@web-widget/web-widget';
import type { ExtractWidgetProps } from '@web-widget/schema';
import { WebWidgetRenderer } from '@web-widget/web-widget';
import {
  Component,
  Fragment,
  Suspense,
  createElement,
  isValidElement,
  use,
  memo,
} from 'react';
import type { FunctionComponent, ReactNode } from 'react';

export interface ReactWidgetComponent<T> extends FunctionComponent<
  T & ReactWidgetProps
> {}

/**
 * Extract the props type `P` from a widget module's default export.
 *
 * Handles multiple component paradigms so that cross-framework widgets
 * (e.g. Vue imported into React) retain their props types:
 *
 * - React: `ComponentType<P>`, `FunctionComponent<P>`, etc.
 * - Vue: components expose `$props` via a constructor signature.
 * - Fallback: `unknown` when no pattern matches.
 */
export interface WebWidgetProps {
  base?: WebWidgetRendererOptions['base'];
  children /**/?: ReactNode;
  data?: WebWidgetRendererOptions['data'];
  import?: WebWidgetRendererOptions['import'];
  inactive?: WebWidgetRendererOptions['inactive'];
  loader /**/: Loader;
  meta?: WebWidgetRendererOptions['meta'];
  loading?: WebWidgetRendererOptions['loading'];
  name?: WebWidgetRendererOptions['name'];
  renderStage?: WebWidgetRendererOptions['renderStage'];
  renderTarget?: WebWidgetRendererOptions['renderTarget'];
}

interface WebWidgetElement {
  localName: string;
  pendingLocalName: string;
  attributes: Record<string, string>;
  innerHTML: Promise<string | Error>;
}

const renderWebWidget = function ({
  children,
  loader,
  ...props
}: WebWidgetProps): WebWidgetElement {
  if (!loader) {
    throw new TypeError(`Missing loader.`);
  }

  if (children) {
    throw new TypeError(`Children not supported.`);
  }

  const widget = new WebWidgetRenderer(loader as Loader, {
    ...props,
    // TODO children
    children: '',
  });
  const localName = widget.localName;
  const attributes = widget.attributes;
  // Catch render errors and resolve with the Error instead of rejecting.
  // In the islands architecture there is no route-level React hydration,
  // so React cannot retry a rejected Promise on the client — a rejection
  // inside Suspense would leave the pending fallback forever.
  // By resolving with the Error, use(innerHTML) returns it normally and
  // WebWidget can render the error UI without React abandoning the subtree.
  const innerHTML = widget
    .renderInnerHTMLToString()
    .catch((err: unknown) =>
      err instanceof Error ? err : new Error(String(err))
    );
  return {
    localName,
    pendingLocalName: widget.pendingLocalName,
    attributes,
    innerHTML,
  };
};

function WebWidget({
  localName,
  pendingLocalName,
  attributes,
  innerHTML,
  errorFallback,
  pendingFallback,
  clientOnly,
}: WebWidgetElement & {
  errorFallback?: ReactNode;
  pendingFallback?: ReactNode;
  clientOnly?: boolean;
}) {
  if (clientOnly && typeof window === 'undefined' && pendingFallback != null) {
    return createElement(
      localName,
      { ...attributes, suppressHydrationWarning: true },
      createElement(
        pendingLocalName,
        {
          'aria-busy': 'true',
          style: { display: 'contents' },
        },
        pendingFallback
      )
    );
  }

  const html = use(innerHTML);

  // Widget rendering failed — render error UI instead of throwing.
  // Throwing would cause React streaming SSR to abandon the subtree,
  // leaving the pending fallback permanently (no client retry in islands).
  if (html instanceof Error) {
    console.error('[ReactWidget] Rendering error:', html);
    return createElement(Fragment, null, errorFallback);
  }

  return createElement(localName, {
    ...attributes,
    dangerouslySetInnerHTML: { __html: html },
    // NOTE: Since the innerHTML property of a widget
    // will inevitably differ between the server and the client,
    // this turns off hydration mismatch warnings.
    suppressHydrationWarning: true,
  });
}

export type DefineWebWidgetOptions = Partial<
  Pick<
    WebWidgetRendererOptions,
    'base' | 'import' | 'loading' | 'name' | 'renderStage' | 'renderTarget'
  >
>;

export type WidgetFallback =
  ReactNode | { pending?: ReactNode; error?: ReactNode };

/**
 * Resolve a WidgetFallback into separate pending and error UI.
 * - `ReactNode`: used for both pending and error.
 * - `{ pending?, error? }`: error defaults to pending if omitted.
 */
export function resolveFallback(fallback: WidgetFallback | undefined): {
  pendingFallback: ReactNode;
  errorFallback: ReactNode;
} {
  if (
    fallback !== null &&
    typeof fallback === 'object' &&
    !isValidElement(fallback) &&
    !Array.isArray(fallback) &&
    ('pending' in fallback || 'error' in fallback)
  ) {
    const obj = fallback as { pending?: ReactNode; error?: ReactNode };
    return {
      pendingFallback: obj.pending,
      errorFallback: obj.error ?? obj.pending,
    };
  }
  return {
    pendingFallback: fallback as ReactNode,
    errorFallback: fallback as ReactNode,
  };
}

export type WidgetContainerConfig = {
  /**
   * Fallback UI for pending and error states.
   *
   * Only effective during server-side rendering: pending UI shows while the
   * widget module renders; error UI shows if rendering fails. Both are
   * serialized into the HTML stream — no client-side retry exists in the
   * islands architecture.
   * For `clientOnly`, pending UI is rendered inside the `<web-widget>` element
   * and removed immediately before its client mount begins.
   *
   * - `ReactNode` — used for both pending (Suspense) and error (ErrorBoundary).
   * - `{ pending?, error? }` — specify independently; `error` defaults to `pending`.
   *
   * @example
   * // Simple: same UI for both states
   * <Widget widget={{ fallback: <Spinner /> }} />
   *
   * // Differentiated: separate pending and error UI
   * <Widget widget={{ fallback: { pending: <Spinner />, error: <ErrorUI /> } }} />
   */
  fallback?: WidgetFallback;
  /** Client-side module loading strategy: `'lazy'` loads on first render, `'eager'` on module parse, `'idle'` on browser idle. */
  loading?: WebWidgetRendererOptions['loading'];
  /** Widget renders only on the server (SSR), producing static HTML with no client-side mount. Mutually exclusive with `clientOnly`. */
  serverOnly?: true;
  /** Widget renders only on the client, producing no server HTML (empty placeholder until client mount). Mutually exclusive with `serverOnly`. */
  clientOnly?: true;
};

export interface ReactWidgetProps {
  children?: ReactNode;
  /** Container configuration, isolated from widget's own props */
  widget?: WidgetContainerConfig;
}

/**
 * Widget-level ErrorBoundary that catches errors during streaming SSR and
 * client hydration. When a widget fails to render (both on server retry and
 * client retry), this boundary renders the fallback instead of crashing the
 * whole page.
 */
class WidgetErrorBoundary extends Component<
  { fallback?: ReactNode; children?: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[ReactWidget] Rendering error:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

/**
 * Container function (WebWidgetAdapter protocol).
 *
 * Wraps a widget module loader into a React component with full props
 * type inference from the source module's default export.
 *
 * For same-framework imports (React → React), props types are inferred
 * automatically. Cross-framework imports use explicit `container()` calls;
 * sources without a structural props contract can use `container<Props>()`.
 *
 * @example
 * ```tsx
 * import { container } from '@web-widget/react/adapter';
 *
 * // Same-framework: full type inference
 * const Counter = container(() => import('./Counter@widget.tsx'));
 * //    ^? ReactWidgetComponent<{ count: number }>
 *
 * <Counter count={42} />  // type-checked: ✓
 *
 * // Cross-framework: explicit container() recommended
 * const VueCounter = container(() => import('./Counter@widget.vue'));
 * <VueCounter count={42} />  // type-checked: ✓
 * ```
 */
export function container<M>(
  loader: () => Promise<M>,
  options?: DefineWebWidgetOptions
): ReactWidgetComponent<ExtractWidgetProps<M>>;
export function container<Props>(
  loader: Loader,
  options?: DefineWebWidgetOptions
): ReactWidgetComponent<Props>;
export function container(
  loader: Loader,
  options: DefineWebWidgetOptions = {}
) {
  return memo(function ReactWidget({
    children,
    widget: {
      fallback,
      loading = options.loading ?? 'lazy',
      serverOnly,
      clientOnly,
    } = {},
    ...data
  }: ReactWidgetProps) {
    const renderStage = serverOnly
      ? 'server'
      : clientOnly
        ? 'client'
        : options.renderStage;
    const { pendingFallback, errorFallback } = resolveFallback(fallback);
    return createElement(
      WidgetErrorBoundary,
      { fallback: errorFallback },
      createElement(Suspense, {
        fallback: pendingFallback,
        children: createElement(WebWidget, {
          clientOnly,
          errorFallback,
          pendingFallback,
          ...renderWebWidget({
            ...options,
            children,
            data,
            loader,
            loading,
            renderStage,
            renderTarget: options.renderTarget ?? 'light',
          }),
        }),
      })
    );
  });
}
