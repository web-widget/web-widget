import type { Loader, WebWidgetRendererOptions } from '@web-widget/web-widget';
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
  T & WebWidgetSuspenseProps
> {}

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
  // inside Suspense would leave the loading fallback forever.
  // By resolving with the Error, use(innerHTML) returns it normally and
  // WebWidget can render the error UI without React abandoning the subtree.
  const innerHTML = widget
    .renderInnerHTMLToString()
    .catch((err: unknown) =>
      err instanceof Error ? err : new Error(String(err))
    );
  return {
    localName,
    attributes,
    innerHTML,
  };
};

function WebWidget({
  localName,
  attributes,
  innerHTML,
  errorFallback,
}: WebWidgetElement & { errorFallback?: ReactNode }) {
  const html = use(innerHTML);

  // Widget rendering failed — render error UI instead of throwing.
  // Throwing would cause React streaming SSR to abandon the subtree,
  // leaving the loading fallback permanently (no client retry in islands).
  if (html instanceof Error) {
    console.error('[widget] Rendering error:', html);
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
  ReactNode | { loading?: ReactNode; error?: ReactNode };

/**
 * Resolve a WidgetFallback into separate loading and error UI.
 * - ReactNode: used for both loading and error.
 * - { loading?, error? }: error defaults to loading if omitted.
 */
export function resolveFallback(fallback: WidgetFallback | undefined): {
  loadingFallback: ReactNode;
  errorFallback: ReactNode;
} {
  if (
    fallback !== null &&
    typeof fallback === 'object' &&
    !isValidElement(fallback) &&
    !Array.isArray(fallback) &&
    ('loading' in fallback || 'error' in fallback)
  ) {
    const obj = fallback as { loading?: ReactNode; error?: ReactNode };
    return {
      loadingFallback: obj.loading,
      errorFallback: obj.error ?? obj.loading,
    };
  }
  return {
    loadingFallback: fallback as ReactNode,
    errorFallback: fallback as ReactNode,
  };
}

export interface WebWidgetSuspenseProps {
  children?: ReactNode;
  /**
   * Fallback UI for loading and error states.
   *
   * - `ReactNode` — used for both loading (Suspense) and error (ErrorBoundary).
   * - `{ loading?, error? }` — specify independently; `error` defaults to `loading`.
   *
   * @example
   * // Simple: same UI for both states
   * <Widget fallback={<Spinner />} />
   *
   * // Differentiated: separate loading and error UI
   * <Widget fallback={{ loading: <Spinner />, error: <ErrorUI /> }} />
   */
  fallback?: WidgetFallback;
  experimental_loading?: WebWidgetRendererOptions['loading'];
  renderStage?: WebWidgetRendererOptions['renderStage'];
  experimental_renderTarget?: WebWidgetRendererOptions['renderTarget'];
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
    console.error('[widget] Rendering error:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

export /*#__PURE__*/ function defineWebWidget(
  loader: Loader,
  options: DefineWebWidgetOptions
) {
  return memo(function WebWidgetSuspense({
    children,
    fallback,
    experimental_loading = options.loading ?? 'lazy',
    renderStage = options.renderStage,
    experimental_renderTarget = options.renderTarget ?? 'light',
    ...data
  }: WebWidgetSuspenseProps) {
    const { loadingFallback, errorFallback } = resolveFallback(fallback);
    return createElement(
      WidgetErrorBoundary,
      { fallback: errorFallback },
      createElement(Suspense, {
        fallback: loadingFallback,
        children: createElement(WebWidget, {
          errorFallback,
          ...renderWebWidget({
            ...options,
            children,
            data,
            loader,
            loading: experimental_loading,
            renderStage,
            renderTarget: experimental_renderTarget,
          }),
        }),
      })
    );
  });
}

/**
 * Container function (WebWidgetAdapter protocol).
 * Alias of `defineWebWidget` — wraps a generic widget module as a React component.
 */
export const container = defineWebWidget;
