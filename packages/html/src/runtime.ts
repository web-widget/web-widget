export * from './components';

import { defineServerRender } from '@web-widget/helpers';
import type { HTML } from './html';
import { renderToStream, renderToString } from './render';

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

    return progressive ? renderToStream(content) : renderToString(content);
  }
);
