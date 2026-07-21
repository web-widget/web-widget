import type { WebWidgetRendererOptions } from '@web-widget/web-widget';
import { WebWidgetRenderer } from '@web-widget/web-widget';
import type {
  ExtractWidgetProps,
  SerializableObject,
  WidgetContainerOptions,
  WidgetContainerProps,
  WidgetHostProps,
  WidgetModuleLoader,
} from '@web-widget/schema';
import { unsafeHTML, suspense, fallback, HTML } from './html';
import type { Suspense, Fallback, UnsafeHTML } from './html';
import { renderToString } from './render';
export type { WidgetContainerOptions } from '@web-widget/schema';

export type HtmlWidgetContainerProps = WidgetContainerProps<
  HTML,
  HTML | ((error: unknown) => HTML)
>;

/**
 * Props accepted by an HTML widget component.
 * Widget's own data props are spread directly, `widget` holds container config.
 */
export type HtmlWidgetProps<T = unknown> = T &
  WidgetHostProps & {
    /** Content preserved in the Widget host light DOM for native Shadow DOM slots. */
    children?: HTML;
    /** Container configuration, isolated from widget's own props */
    widget?: HtmlWidgetContainerProps;
  };

export type HtmlWidgetComponent<T = unknown> = (
  props?: HtmlWidgetProps<T>
) => Promise<UnsafeHTML | Suspense | Fallback>;

/** Resolve WidgetFallback into separate pending and error UI. */
export function resolveFallback(
  fallback: HtmlWidgetContainerProps['fallback']
): {
  pendingFallback: HTML;
  errorFallback?: HTML | ((e: any) => HTML);
} {
  if (
    fallback !== null &&
    typeof fallback === 'object' &&
    !(fallback instanceof HTML) &&
    ('pending' in fallback || 'error' in fallback)
  ) {
    const obj = fallback as {
      pending?: HTML;
      error?: HTML | ((e: any) => HTML);
    };
    return {
      pendingFallback: obj.pending!,
      errorFallback: obj.error ?? obj.pending,
    };
  }
  return {
    pendingFallback: fallback as HTML,
    errorFallback: fallback as HTML,
  };
}

/**
 * Extract the props type `P` from a widget module's default export.
 *
 * Handles multiple component paradigms so that cross-framework widgets
 * (e.g. Vue or React imported into HTML) retain their props types:
 *
 * - HTML/React functional: `(props?: T, ...) => ...` or `ComponentType<P>`
 * - Vue: components expose `$props` via a constructor signature.
 * - Fallback: `unknown` when no pattern matches.
 */
/**
 * Container function (WidgetAdapter protocol).
 *
 * Wraps a widget module loader into a callable function that returns
 * `Promise<UnsafeHTML>`, interpolatable directly into `html` templates.
 *
 * Props types are inferred from the source module's default export,
 * enabling type-safe widget calls without manual conversion functions.
 *
 * @example
 * ```ts
 * import { widget } from '@web-widget/html/adapter';
 *
 * const Counter = widget(() => import('./Counter@widget.tsx'));
 * //    ^? HtmlWidgetComponent<{ count: number }>
 *
 * const result = await Counter({ count: 42 });  // type-checked: ✓
 * ```
 */
export function widget<M>(
  loader: () => Promise<M>,
  options?: WidgetContainerOptions
): HtmlWidgetComponent<ExtractWidgetProps<M>>;
export function widget<Props>(
  loader: WidgetModuleLoader,
  options?: WidgetContainerOptions
): HtmlWidgetComponent<Props>;
export function widget(
  loader: WidgetModuleLoader,
  options: WebWidgetRendererOptions = {}
) {
  return async function HtmlWidget<T>(
    {
      children,
      slot,
      widget: { id, loading, serverOnly, clientOnly, fallback: fb } = {},
      ...data
    }: HtmlWidgetProps<T> = {} as HtmlWidgetProps<T>
  ): Promise<UnsafeHTML | Suspense | Fallback> {
    const renderOptions = {
      id,
      loading: loading ?? options.loading,
      renderStage: serverOnly
        ? ('server' as const)
        : clientOnly
          ? ('client' as const)
          : options.renderStage,
    };

    const lightChildrenHTML = children ? await renderToString(children) : '';
    const renderer = new WebWidgetRenderer(loader, {
      ...options,
      data: data as SerializableObject,
      ...renderOptions,
      root: options.root,
      slot,
    });

    if (fb) {
      const { pendingFallback, errorFallback } = resolveFallback(fb);
      if (clientOnly && pendingFallback) {
        const pendingHTML = await renderToString(pendingFallback);
        return unsafeHTML(
          await renderer.renderOuterHTMLToString({
            children: lightChildrenHTML,
            pendingHTML,
          })
        );
      }
      const content = renderer
        .renderOuterHTMLToString({ children: lightChildrenHTML })
        .then((html) => unsafeHTML(html));
      const s = suspense(content, pendingFallback);
      return errorFallback ? fallback(s, errorFallback) : s;
    }

    return renderer
      .renderOuterHTMLToString({ children: lightChildrenHTML })
      .then((html) => unsafeHTML(html));
  };
}
