import { defineServerRender } from '@web-widget/helpers';
import type { Component } from 'solid-js';
import { createComponent } from 'solid-js';
import { renderToStream, renderToStringAsync } from 'solid-js/web';
export * from './components';

// Both Solid streaming and renderToStringAsync may emit coordination scripts
// that access _$HY. Vite dev SSR can resolve Solid's browser development
// runtime, where the built-in HydrationScript helper is a no-op, so bootstrap
// the runtime explicitly before any rendered output.
const HYDRATION_SCRIPT_FALLBACK = [
  '<script>',
  'window._$HY||(e=>{let t=e=>e&&e.hasAttribute&&(e.hasAttribute("data-hk")?e:t(e.host&&e.host.nodeType?e.host:e.parentNode));',
  '["click","input"].forEach(o=>document.addEventListener(o,o=>{if(!e.events)return;let s=t(o.composedPath&&o.composedPath()[0]||o.target);',
  's&&!e.completed.has(s)&&e.events.push([s,o])}))})(_$HY={events:[],completed:new WeakSet,r:{},fe(){}});',
  '</script><!--xs-->',
].join('');

export const render = defineServerRender<Component<any>>(
  async (component, data, { progressive }) => {
    if (!component) throw new TypeError('Missing component.');
    const view = () => createComponent(component, data ?? {});
    if (!progressive) {
      return HYDRATION_SCRIPT_FALLBACK + (await renderToStringAsync(view));
    }
    return new ReadableStream<string>({
      start(controller) {
        // Web Router treats the first emitted chunk as the framework shell.
        // Keep the bootstrap and shell together so their ordering is retained.
        let shellPending = true;
        const writable = {
          write(chunk: string) {
            controller.enqueue(
              shellPending ? HYDRATION_SCRIPT_FALLBACK + chunk : chunk
            );
            shellPending = false;
          },
          end() {
            controller.close();
          },
        };
        renderToStream(view).pipe(writable);
      },
    });
  }
);
