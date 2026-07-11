import type {
  Loader,
  SerializableObject,
  WebWidgetRendererOptions,
} from '@web-widget/web-widget';
import { WebWidgetRenderer } from '@web-widget/web-widget';
import { unsafeHTML, suspense, fallback } from './html';
import type { Suspense, Fallback, UnsafeHTML } from './html';
import { HTML } from './html';

export type DefineWebWidgetOptions = Partial<
  Pick<
    WebWidgetRendererOptions,
    'base' | 'import' | 'loading' | 'name' | 'renderStage' | 'renderTarget'
  >
>;

export type WidgetFallback =
  HTML | { pending?: HTML; error?: HTML | ((e: any) => HTML) };

export type WidgetContainerConfig = {
  /**
   * Fallback UI for pending and error states.
   *
   * Only effective inside `renderToStream`: wraps the widget in a Suspense
   * boundary so slow widgets don't block the rest of the stream.
   *
   * - `HTML` — used for both pending (Suspense) and error.
   * - `{ pending?, error? }` — specify independently; `error` defaults to `pending`.
   *
   * @example
   * // Simple: same UI for both states
   * Widget({ widget: { fallback: html`<div>Loading...</div>` } })
   *
   * // Differentiated: separate pending and error UI
   * Widget({ widget: { fallback: { pending: html`<div>Loading...</div>`, error: html`<div>Error!</div>` } } })
   */
  fallback?: WidgetFallback;
  /** Client-side module loading strategy: `'lazy'` loads on first render, `'eager'` on module parse, `'idle'` on browser idle. */
  loading?: WebWidgetRendererOptions['loading'];
  /** Widget renders only on the server (SSR), producing static HTML with no client-side mount. Mutually exclusive with `clientOnly`. */
  serverOnly?: true;
  /** Widget renders only on the client, producing no server HTML (empty placeholder until client mount). Mutually exclusive with `serverOnly`. */
  clientOnly?: true;
};

/**
 * Props accepted by an HTML widget component.
 * Widget's own data props are spread directly, `widget` holds container config.
 */
export type HtmlWidgetProps<T = unknown> = T & {
  /** Container configuration, isolated from widget's own props */
  widget?: WidgetContainerConfig;
};

export type HtmlWidgetComponent<T = unknown> = (
  props?: HtmlWidgetProps<T>
) => Promise<UnsafeHTML | Suspense | Fallback>;

/** Resolve WidgetFallback into separate pending and error UI. */
export function resolveFallback(fallback: WidgetFallback): {
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
 * Adapt a framework component type to an HTML widget component type.
 *
 * This is a type-level cast only — the actual cross-framework rendering
 * is handled by the `@widget` system. Use this when importing a widget
 * (e.g. `Counter@widget.tsx`) into an HTML template file so that
 * TypeScript treats it as a callable returning `Promise<UnsafeHTML>`.
 *
 * The props type `T` should be specified manually to match the widget's
 * props interface.
 *
 * @example
 * ```ts
 * import ReactCounter from './Counter@widget.tsx';
 * const Counter = asHtmlWidget<{ count: number }>(ReactCounter);
 * Counter({ count: 1 });
 * ```
 */
export /*#__INLINE__*/ function asHtmlWidget<T = unknown>(
  component: unknown
): HtmlWidgetComponent<T> {
  return component as unknown as HtmlWidgetComponent<T>;
}

/**
 * Container function (WebWidgetAdapter protocol).
 *
 * Wraps a widget module loader into a callable function that returns
 * `Promise<UnsafeHTML>`, interpolatable directly into `html` templates.
 *
 * Injected by the build tool when importing `@widget` modules in `.html.ts`
 * / `.html.js` route files.
 */
export function container(loader: Loader, options: DefineWebWidgetOptions) {
  return async function HtmlWidget<T>(
    {
      widget: { loading, serverOnly, clientOnly, fallback: fb } = {},
      ...data
    }: HtmlWidgetProps<T> = {} as HtmlWidgetProps<T>
  ): Promise<UnsafeHTML | Suspense | Fallback> {
    const renderStage = serverOnly
      ? 'server'
      : clientOnly
        ? 'client'
        : options.renderStage;

    const renderer = new WebWidgetRenderer(loader, {
      ...options,
      data: data as SerializableObject,
      loading: loading ?? options.loading ?? 'lazy',
      renderStage,
      renderTarget: options.renderTarget ?? 'light',
    });

    const content = renderer
      .renderOuterHTMLToString()
      .then((html) => unsafeHTML(html));

    if (fb) {
      const { pendingFallback, errorFallback } = resolveFallback(fb);
      const s = suspense(content, pendingFallback);
      return errorFallback ? fallback(s, errorFallback) : s;
    }

    return content;
  };
}
