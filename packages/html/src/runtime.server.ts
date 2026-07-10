import type {
  Loader,
  SerializableObject,
  WebWidgetRendererOptions,
} from '@web-widget/web-widget';
import { WebWidgetRenderer } from '@web-widget/web-widget';
import { unsafeHTML } from './html';
import type { UnsafeHTML } from './html';

export { render } from './server';

export type DefineWebWidgetOptions = Partial<
  Pick<
    WebWidgetRendererOptions,
    'base' | 'import' | 'loading' | 'name' | 'renderStage' | 'renderTarget'
  >
>;

export type WidgetContainerConfig = {
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
) => Promise<UnsafeHTML>;

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
export function widget(
  loader: Loader,
  options: WebWidgetRendererOptions = {}
): Promise<UnsafeHTML> {
  const renderer = new WebWidgetRenderer(loader, options);
  return renderer.renderOuterHTMLToString().then((html) => unsafeHTML(html));
}

/**
 * Container function (WebWidgetAdapter protocol).
 *
 * Wraps a widget module loader into a callable function that returns
 * `Promise<UnsafeHTML>`, interpolatable directly into `html` templates.
 *
 * Injected by the build tool when importing `@widget` modules in `.html.ts`
 * route files.
 */
export function container(loader: Loader, options: DefineWebWidgetOptions) {
  return async function HtmlWidget<T>(
    {
      widget: { loading, serverOnly, clientOnly } = {},
      ...data
    }: HtmlWidgetProps<T> = {} as HtmlWidgetProps<T>
  ): Promise<UnsafeHTML> {
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

    return renderer.renderOuterHTMLToString().then((html) => unsafeHTML(html));
  };
}
