import { defineClientRender } from '@web-widget/helpers';
import type { Component } from 'svelte';
import { hydrate, mount, unmount } from 'svelte';
export * from './components';

function hasHydrationStart(container: ParentNode): boolean {
  for (const node of container.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) continue;
    return node.nodeType === Node.COMMENT_NODE && node.textContent === '[';
  }
  return false;
}

export const render = defineClientRender<Component<any>>(
  async (component, data, { container, recovering }) => {
    if (!component) throw new TypeError('Missing component.');
    if (!container) throw new Error('Missing container.');
    let instance: Record<string, any> | undefined;
    return {
      mount() {
        const options = { target: container as Element, props: data ?? {} };
        if (recovering) {
          if (!hasHydrationStart(container)) {
            throw new Error(
              'Cannot recover Svelte widget: SSR hydration markers are missing.'
            );
          }
          instance = hydrate(component, { ...options, recover: false });
        } else {
          instance = mount(component, options);
        }
      },
      async unmount() {
        if (instance) await unmount(instance);
        instance = undefined;
      },
    };
  }
);
