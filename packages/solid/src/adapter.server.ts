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
  async (component, data, { id, progressive }) => {
    if (!component) throw new TypeError('Missing component.');
    const view = () => createComponent(component, data ?? {});
    if (!progressive) {
      return (
        HYDRATION_SCRIPT + (await renderToStringAsync(view, { renderId: id }))
      );
    }
    let resolveShell!: () => void;
    let rejectShell!: (error: unknown) => void;
    const shellReady = new Promise<void>((resolve, reject) => {
      resolveShell = resolve;
      rejectShell = reject;
    });

    const stream = new ReadableStream<string>({
      start(controller) {
        // Web Router treats the first emitted chunk as the framework shell.
        // Keep the bootstrap and shell together so their ordering is retained.
        let shellPending = true;
        let active = true;
        const writable = {
          write(chunk: string) {
            if (!active) return;
            const shell = shellPending;
            shellPending = false;
            controller.enqueue(shell ? HYDRATION_SCRIPT + chunk : chunk);
            if (shell) resolveShell();
          },
          end() {
            if (!active) return;
            active = false;
            controller.close();
            if (shellPending) resolveShell();
          },
        };
        try {
          const streamOptions = {
            renderId: id,
            onError(error: unknown) {
              if (!active) return;
              if (shellPending) {
                active = false;
                rejectShell(error);
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
          rejectShell(error);
          controller.error(error);
        }
      },
    });

    // Keep the stream itself as the buffer. Waiting only gates response status
    // so shell errors still become 500 without creating a second replay stream.
    await shellReady;
    return stream;
  }
);
