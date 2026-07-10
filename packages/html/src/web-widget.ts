import type { Loader, WebWidgetRendererOptions } from '@web-widget/web-widget';
import { WebWidgetRenderer } from '@web-widget/web-widget';
import { unsafeHTML } from './html';
import type { UnsafeHTML } from './html';

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
 * import { html, render, widget, fallback } from '@web-widget/html';
 *
 * export { render };
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
export function widget(
  loader: Loader,
  options: WebWidgetRendererOptions = {}
): Promise<UnsafeHTML> {
  const renderer = new WebWidgetRenderer(loader, options);
  return renderer.renderOuterHTMLToString().then((html) => unsafeHTML(html));
}
