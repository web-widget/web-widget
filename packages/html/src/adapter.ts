import { defineServerRender } from '@web-widget/helpers';
import type { HTML } from './html';
import { renderToStream, renderToString } from './render';
import type { HtmlWidgetComponent } from './components';

export * from './components';

/**
 * Adapt a framework component type to an HTML widget component type.
 *
 * @deprecated Use `widget()` from `@web-widget/html/adapter` instead.
 * Explicit `widget(() => import(...))` calls infer cross-framework props.
 * Static imports preserve the source component type during type checking.
 *
 * This is a type-level cast only — the actual cross-framework rendering
 * is handled by the `@widget` system.
 */
export /*#__INLINE__*/ function asHtmlWidget<T = unknown>(
  component: unknown
): HtmlWidgetComponent<T> {
  return component as unknown as HtmlWidgetComponent<T>;
}

/**
 * Server render function (AdapterModule contract).
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
