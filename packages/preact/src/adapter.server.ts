import { defineServerRender } from '@web-widget/helpers';
import { Fragment, h, type ComponentType } from 'preact';
import { renderToStringAsync } from 'preact-render-to-string';
import { renderToReadableStream } from 'preact-render-to-string/stream';
import { createWidgetAdapter } from './components';
export type {
  PreactWidgetComponent,
  PreactWidgetContainerProps,
  PreactWidgetFactory,
  WidgetContainerOptions,
} from './components';

export const widget = createWidgetAdapter(
  async (children) => await renderToStringAsync(h(Fragment, null, children))
);

export const render = defineServerRender<ComponentType<any>>(
  async (component, data, { progressive }) => {
    if (!component) throw new TypeError('Missing component.');
    const vnode = h(component, data ?? {});

    if (!progressive) {
      return renderToStringAsync(vnode);
    }

    const byteStream = renderToReadableStream(vnode);
    // The stream exposes allReady for consumers that need it. The adapter
    // surfaces failures through the readable stream, so consume this promise
    // as well to avoid an unhandled rejection when the shell throws.
    void byteStream.allReady.catch(() => {});
    const reader = byteStream.getReader();
    const first = await reader.read();

    // Preact returns a stream immediately. Read the shell before returning so
    // shell errors reject the adapter call and can still produce a 500 response.
    return new ReadableStream<Uint8Array>({
      start(controller) {
        if (first.done) {
          controller.close();
        } else {
          controller.enqueue(first.value);
        }
      },
      async pull(controller) {
        try {
          const { value, done } = await reader.read();
          if (done) controller.close();
          else controller.enqueue(value);
        } catch (error) {
          controller.error(error);
        }
      },
      cancel(reason) {
        return reader.cancel(reason);
      },
    });
  }
);
