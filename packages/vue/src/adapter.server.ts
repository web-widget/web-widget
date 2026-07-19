import { defineServerRender } from '@web-widget/helpers';
import { type Component, createSSRApp, h, Suspense } from 'vue';
import {
  renderToString,
  renderToWebStream,
  type SSRContext,
} from 'vue/server-renderer';
import type { CreateVueRenderOptions } from './types';
import errorHandler from './error-handler';

declare module '@web-widget/schema' {
  interface ServerRenderOptions {
    vue?: {};
  }
}

export * from './components';

// Helper function to create the WidgetSuspense component
const createWidgetSuspense = (component: Component) => (props: any) =>
  h(Suspense, null, [h(component, props)]);

export interface VueRenderOptions {
  vue?: SSRContext;
}

export const createVueRender = ({
  onCreatedApp = async () => {},
}: CreateVueRenderOptions = {}) => {
  return defineServerRender<Component>(
    async (component, data, { progressive, vue: options }) => {
      data = data ?? {};

      if (!component) {
        throw new TypeError(`Missing component.`);
      }

      const ssrContext: SSRContext = Object.create(options ?? null);

      let error;
      const context = { data, progressive }; // Context for lifecycle hooks
      const WidgetSuspense = createWidgetSuspense(component);
      const app = createSSRApp(WidgetSuspense, data as any);

      errorHandler(app, (err) => {
        error = err;
      });

      // Call the user-defined lifecycle hook
      await onCreatedApp(app, context, component, data);

      if (progressive) {
        const byteStream = renderToWebStream(app, ssrContext);

        // Vue's renderToWebStream renders asynchronously (via Promise
        // microtasks). Consume the first chunk to flush the microtask queue,
        // ensuring errorHandler has fired before we check for errors.
        // This mirrors React's renderToReadableStream shell-error semantics:
        // if rendering fails, the Promise rejects so the framework can
        // return a 500 response.
        const reader = (byteStream as ReadableStream<Uint8Array>).getReader();
        const first = await reader.read();

        try {
          if (ssrContext?.teleports) {
            const file = Reflect.get(component, '__file') ?? 'unknown';
            throw new Error(
              `Teleports are not supported in SSR: ${JSON.stringify(ssrContext.teleports, null, 2)} in ${file}` +
                `\nDo conditionally render Teleport when mounted on the client.`
            );
          }

          if (error) {
            throw error;
          }
        } catch (e) {
          // Release the reader lock and cancel the source stream on error.
          await reader.cancel();
          throw e;
        }

        // Return a stream that replays the buffered first chunk,
        // then continues piping the remaining chunks.
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
              if (done) {
                controller.close();
              } else {
                controller.enqueue(value);
              }
            } catch (e) {
              controller.error(e);
            }
          },
          async cancel() {
            await reader.cancel();
          },
        });
      }

      const html = await renderToString(app, ssrContext);

      if (ssrContext?.teleports) {
        const file = Reflect.get(component, '__file') ?? 'unknown';
        throw new Error(
          `Teleports are not supported in SSR: ${JSON.stringify(ssrContext.teleports, null, 2)} in ${file}` +
            `\nDo conditionally render Teleport when mounted on the client.`
        );
      }

      if (error) {
        throw error;
      }

      return html;
    }
  );
};

/**@deprecated Please use `createVueRender` instead.*/
export const defineVueRender = createVueRender;

export const render = createVueRender();
