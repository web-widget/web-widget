import { defineServerRender } from '@web-widget/helpers';
import type { Component } from 'solid-js';
import { createComponent } from 'solid-js';
import { renderToStream, renderToStringAsync } from 'solid-js/web';
export * from './components';

export const render = defineServerRender<Component<any>>(
  async (component, data, { progressive }) => {
    if (!component) throw new TypeError('Missing component.');
    const view = () => createComponent(component, data ?? {});
    if (!progressive) return renderToStringAsync(view);
    const stream = new TransformStream<string, string>();
    void renderToStream(view).pipeTo(stream.writable);
    return stream.readable;
  }
);
