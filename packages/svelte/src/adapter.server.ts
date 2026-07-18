import { defineServerRender } from '@web-widget/helpers';
import type { Component } from 'svelte';
import { render as renderComponent } from 'svelte/server';
export * from './components';

export const render = defineServerRender<Component<any>>(
  async (component, data, { progressive }) => {
    if (!component) throw new TypeError('Missing component.');
    if (progressive) {
      console.warn(
        'Svelte does not support progressive server rendering; falling back to buffered rendering.'
      );
    }
    const output = await renderComponent(component, { props: data ?? {} });
    return output.body;
  }
);
