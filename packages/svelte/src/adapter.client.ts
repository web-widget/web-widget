import { defineClientRender } from '@web-widget/helpers';
import type { Component } from 'svelte';
import { hydrate, mount, unmount } from 'svelte';
export * from './components';

export const render = defineClientRender<Component<any>>(
  async (component, data, { container, recovering }) => {
    if (!component) throw new TypeError('Missing component.');
    if (!container) throw new Error('Missing container.');
    let instance: Record<string, any> | undefined;
    return {
      mount() {
        const options = { target: container as Element, props: data ?? {} };
        instance = recovering
          ? hydrate(component, { ...options, recover: true })
          : mount(component, options);
      },
      async unmount() {
        if (instance) await unmount(instance);
        instance = undefined;
      },
    };
  }
);
