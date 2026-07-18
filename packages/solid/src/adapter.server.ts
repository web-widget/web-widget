import { defineServerRender } from '@web-widget/helpers';
import type { Component } from 'solid-js';
import { createComponent } from 'solid-js';
import {
  generateHydrationScript,
  renderToStream,
  renderToStringAsync,
} from 'solid-js/web';
export * from './components';

// Each independently recoverable widget needs the same event queue and
// hydration registry bootstrap that Solid normally emits at document level.
const HYDRATION_SCRIPT = generateHydrationScript();

export const render = defineServerRender<Component<any>>(
  async (component, data, { key, progressive }) => {
    if (!component) throw new TypeError('Missing component.');
    const view = () => createComponent(component, data ?? {});
    if (!progressive) {
      return (
        HYDRATION_SCRIPT + (await renderToStringAsync(view, { renderId: key }))
      );
    }
    const stream = new ReadableStream<string>({
      start(controller) {
        // Web Router treats the first emitted chunk as the framework shell.
        // Keep the bootstrap and shell together so their ordering is retained.
        let shellPending = true;
        let active = true;
        const writable = {
          write(chunk: string) {
            if (!active) return;
            controller.enqueue(shellPending ? HYDRATION_SCRIPT + chunk : chunk);
            shellPending = false;
          },
          end() {
            if (!active) return;
            active = false;
            controller.close();
          },
        };
        try {
          const streamOptions = {
            renderId: key,
            onError(error: unknown) {
              if (!active) return;
              if (shellPending) {
                active = false;
                controller.error(error);
              } else {
                console.error(error);
              }
            },
          } as Parameters<typeof renderToStream>[1] & {
            onError(error: unknown): void;
          };
          renderToStream(view, streamOptions).pipe(writable);
        } catch (error) {
          active = false;
          controller.error(error);
        }
      },
    });

    const reader = stream.getReader();
    const first = await reader.read();

    // Solid also returns its stream before the shell is ready. Buffer one chunk
    // so an initial render failure rejects this call instead of committing 200.
    return new ReadableStream<string>({
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
