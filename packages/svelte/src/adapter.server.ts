import { defineServerRender } from '@web-widget/helpers';
import type { Component } from 'svelte';
import { render as renderComponent } from 'svelte/server';
export * from './components';

export const render = defineServerRender<Component<any>>(
  async (component, data) => {
    if (!component) throw new TypeError('Missing component.');
    const output = await renderComponent(component, { props: data ?? {} });
    return output.body;
  }
);
