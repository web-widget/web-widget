import { defineClientRender } from '@web-widget/helpers';
import type { Component } from 'solid-js';
import { createComponent, sharedConfig } from 'solid-js';
import { hydrate, render as renderComponent } from 'solid-js/web';
export * from './components';

interface SolidHydrationRuntime {
  completed: WeakSet<Node>;
  done?: boolean;
  events: unknown[];
  fe: (id: string) => void;
  r: Record<string, unknown>;
}

function ensureHydrationRuntime(): void {
  const runtime = globalThis as typeof globalThis & {
    _$HY?: Partial<SolidHydrationRuntime>;
  };
  if (!runtime._$HY) {
    runtime._$HY = {
      completed: new WeakSet<Node>(),
      events: [],
      fe: () => undefined,
      r: {},
    };
    return;
  }
  runtime._$HY.completed ??= new WeakSet<Node>();
  runtime._$HY.events ??= [];
  runtime._$HY.fe ??= () => undefined;
  runtime._$HY.r ??= {};
}

export const render = defineClientRender<Component<any>>(
  async (component, data, { container, key, recovering }) => {
    if (!component) throw new TypeError('Missing component.');
    if (!container) throw new Error('Missing container.');
    let dispose: (() => void) | undefined;
    return {
      mount() {
        const view = () => createComponent(component, data ?? {});
        const canHydrate =
          recovering && container.querySelector('[data-hk]') !== null;
        if (recovering && !canHydrate) {
          throw new Error(
            'Cannot hydrate Solid widget: SSR hydration markers are missing.'
          );
        }
        if (recovering) {
          ensureHydrationRuntime();
          const runtime = globalThis as typeof globalThis & {
            _$HY: SolidHydrationRuntime;
          };
          // Solid marks its single global hydration pass complete after the
          // first delegated event. Re-open that pass for independently loaded
          // widget roots while preserving their render-key namespaces.
          runtime._$HY.done = false;
          sharedConfig.done = false;
          dispose = hydrate(view, container, { renderId: key });
        } else {
          container.replaceChildren();
          dispose = renderComponent(view, container);
        }
      },
      unmount() {
        dispose?.();
        dispose = undefined;
      },
    };
  }
);
