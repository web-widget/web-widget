import type { Loader, WebWidgetRendererOptions } from '@web-widget/web-widget';
import { WebWidgetRenderer } from '@web-widget/web-widget';
import { unsafeHTML } from './html';
import type { UnsafeHTML } from './html';
import type { HtmlWidgetComponent } from './runtime';

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
 * Embeds a framework widget (React, Vue, Vue2, etc.) into an HTML template.
 *
 * On the server, renders the widget to a `<web-widget>` element's HTML string.
 * On the client, the `<web-widget>` custom element automatically loads and
 * hydrates the widget module — no host template involvement needed.
 *
 * @param loader Widget module loader
 * @param options Render options (data, loading strategy, etc.)
 * @returns Promise<UnsafeHTML> that resolves to the widget's HTML
 *
 * @example
 * ```ts
 * import { html, widget, fallback } from '@web-widget/html';
 *
 * export default function Page() {
 *   return html`<div>
 *     <h1>Dashboard</h1>
 *     ${fallback(
 *       widget(() => import('./Counter@widget.tsx'), { data: { count: 1 } }),
 *       () => html`<div>Widget failed</div>`
 *     )}
 *   </div>`;
 * }
 * ```
 */
export async function widget(
  loader: Loader,
  options: WebWidgetRendererOptions = {}
): Promise<UnsafeHTML> {
  const renderer = new WebWidgetRenderer(loader, options);
  const html = await renderer.renderOuterHTMLToString();
  return unsafeHTML(html);
}
