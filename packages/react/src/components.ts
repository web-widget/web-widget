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
  Component,
  Fragment,
  Suspense,
  createElement,
  isValidElement,
  use,
  memo,
} from 'react';
import type { FunctionComponent, ReactNode } from 'react';
export type { WidgetContainerOptions } from '@web-widget/schema';

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
/** Inputs used by the React renderer wrapper. */
export type WebWidgetProps = Omit<WebWidgetRendererOptions, 'children'> & {
  /** Widget module loader supplied by the generated adapter call. */
  loader: WidgetModuleLoader;
  /** React children preserved in the Widget host light DOM. */
  children?: ReactNode;
};

interface WebWidgetElement {
  localName: string;
  pendingBoundary: Omit<
    WebWidgetRendererInterface['pendingBoundary'],
    'slot'
  > & {
    localName?: string;
    slot?: string;
  };
  attributes: Record<string, string>;
  children?: ReactNode;
  innerHTML: Promise<string | Error>;
}

const renderWebWidget = function ({
  children,
  loader,
  renderChildren,
  ...props
}: WebWidgetProps & {
  renderChildren?: (children: ReactNode) => Promise<string>;
}): WebWidgetElement {
  if (!loader) {
    throw new TypeError(`Missing loader.`);
  }

  const widget = new WebWidgetRenderer(loader, {
    ...props,
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
  const innerHTML = (async () => {
    if (!renderChildren) {
      return children ? '' : widget.renderInnerHTMLToString();
    }
    if (!children) {
      return widget.renderInnerHTMLToString();
    }
    const lightChildrenHTML = await renderChildren(children);
    const renderer = new WebWidgetRenderer(loader, {
      ...props,
      children: lightChildrenHTML,
      id: attributes.id,
    });
    return renderer.renderInnerHTMLToString();
  })().catch((err: unknown) =>
    err instanceof Error ? err : new Error(String(err))
  );
  return {
    localName,
    pendingBoundary: widget.pendingBoundary ?? {
      ariaBusy: true,
      display: 'contents',
      localName: 'web-widget-pending',
    },
    attributes,
    children,
    innerHTML,
  };
};

function WebWidget({
  localName,
  pendingBoundary,
  attributes,
  innerHTML,
  errorFallback,
  pendingFallback,
  clientOnly,
  children,
  renderChildren,
}: WebWidgetElement & {
  errorFallback?: ReactNode;
  pendingFallback?: ReactNode;
  clientOnly?: boolean;
  renderChildren?: (children: ReactNode) => Promise<string>;
}) {
  if (!renderChildren && children) {
    return createElement(
      localName,
      { ...attributes, suppressHydrationWarning: true },
      children
    );
  }

  if (clientOnly && typeof window === 'undefined' && pendingFallback != null) {
    return createElement(
      localName,
      { ...attributes, suppressHydrationWarning: true },
      createElement(
        pendingBoundary.localName ?? 'web-widget-pending',
        {
          'aria-busy': String(pendingBoundary.ariaBusy),
          ...(pendingBoundary.slot ? { slot: pendingBoundary.slot } : {}),
          style: { display: pendingBoundary.display },
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

export type ReactWidgetContainerProps = WidgetContainerProps<ReactNode>;

/**
 * Resolve a WidgetFallback into separate pending and error UI.
 * - `ReactNode`: used for both pending and error.
 * - `{ pending?, error? }`: error defaults to pending if omitted.
 */
export function resolveFallback(
  fallback: ReactWidgetContainerProps['fallback']
): {
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

export interface ReactWidgetProps extends WidgetHostProps {
  children?: ReactNode;
  /** Container configuration, isolated from widget's own props */
  widget?: ReactWidgetContainerProps;
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
 * Container function (WidgetAdapter protocol).
 *
 * Wraps a widget module loader into a React component with full props
 * type inference from the source module's default export.
 *
 * For same-framework imports (React → React), props types are inferred
 * automatically. Cross-framework imports use explicit `widget()` calls;
 * sources without a structural props contract can use `widget<Props>()`.
 *
 * @example
 * ```tsx
 * import { widget } from '@web-widget/react/adapter';
 *
 * // Same-framework: full type inference
 * const Counter = widget(() => import('./Counter@widget.tsx'));
 * //    ^? ReactWidgetComponent<{ count: number }>
 *
 * <Counter count={42} />  // type-checked: ✓
 *
 * // Cross-framework: explicit widget() recommended
 * const VueCounter = widget(() => import('./Counter@widget.vue'));
 * <VueCounter count={42} />  // type-checked: ✓
 * ```
 */
export interface ReactWidgetFactory {
  <M>(
    loader: () => Promise<M>,
    options?: WidgetContainerOptions
  ): ReactWidgetComponent<ExtractWidgetProps<M>>;
  <Props>(
    loader: WidgetModuleLoader,
    options?: WidgetContainerOptions
  ): ReactWidgetComponent<Props>;
}

export function createWidgetAdapter(
  renderChildren?: (children: ReactNode) => Promise<string>
): ReactWidgetFactory {
  return function widget(
    loader: WidgetModuleLoader,
    options: WebWidgetRendererOptions = {}
  ) {
    return memo(function ReactWidget({
      children,
      slot,
      widget: {
        fallback,
        id,
        loading = options.loading,
        serverOnly,
        clientOnly,
      } = {},
      ...data
    }: ReactWidgetProps) {
      const renderOptions = {
        id,
        loading: loading ?? options.loading,
        renderStage: serverOnly
          ? ('server' as const)
          : clientOnly
            ? ('client' as const)
            : options.renderStage,
      };
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
            renderChildren,
            ...renderWebWidget({
              ...options,
              children,
              data,
              loader,
              renderChildren,
              ...renderOptions,
              renderTarget: options.renderTarget,
              slot,
            }),
          }),
        })
      );
    });
  } as ReactWidgetFactory;
}
