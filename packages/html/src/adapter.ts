export * from './components';

import { defineServerRender } from '@web-widget/helpers';
import type { HTML } from './html';
import { renderToStream, renderToString } from './render';
import type { HtmlWidgetComponent } from './components';

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
 * Server render function (WebWidgetAdapter protocol).
 *
 * Calls the route component, converts the returned HTML template to a
 * UTF-8 encoded ReadableStream.
 */
export const render = defineServerRender<Function>(
  async (component, data, { progressive }) => {
    data = data ?? {};

    if (!component) {
      throw new TypeError(`Missing component.`);
    }

    const content: HTML = await component(data as any);

    return progressive
      ? await renderToStream(content)
      : renderToString(content);
  }
);
