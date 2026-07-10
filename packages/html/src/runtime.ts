import { defineServerRender } from '@web-widget/helpers';
import type {
  Loader,
  SerializableObject,
  WebWidgetRendererOptions,
} from '@web-widget/web-widget';
import { WebWidgetRenderer } from '@web-widget/web-widget';
import type { HTML, UnsafeHTML } from './html';
import { unsafeHTML } from './html';
import { HTMLToStream } from './stream';

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
 * Server render function (WebWidgetAdapter protocol).
 *
 * Calls the route component, converts the returned HTML template to a
 * UTF-8 encoded ReadableStream.
 */
export const render = defineServerRender<Function>(
  async (component, data, { progressive: _ignore }) => {
    data = data ?? {};

    if (!component) {
      throw new TypeError(`Missing component.`);
    }

    const content: HTML = await component(data as any);

    return HTMLToStream(content);
  }
);

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
