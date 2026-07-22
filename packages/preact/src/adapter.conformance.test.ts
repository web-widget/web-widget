import { describe, expect, test, vi } from 'vitest';
import { h } from 'preact';
import { testAdapterConformance } from '@web-widget/schema/testing';
import * as server from './adapter.server';
import * as client from './adapter.client';

const Component = ({ message }: { message: string }) => h('p', null, message);
const SlottedWidget = server.widget(
  async () => ({
    default: {},
    render: async () => '<slot name="label">SHADOW_SLOT_MARKER</slot>',
  }),
  { import: '/slotted-widget.js', root: 'shadow' }
);
const SlotComponent = () =>
  h(
    SlottedWidget,
    { slot: 'adapter-actions' },
    h('span', { slot: 'label' }, 'LIGHT_SLOT_MARKER')
  );
const PendingWidget = server.widget(async () => ({ default: {} }), {
  import: '/pending-widget.js',
  root: 'shadow',
});
const PendingComponent = () =>
  h(PendingWidget, {
    widget: {
      clientOnly: true,
      fallback: h('span', null, 'PENDING_BOUNDARY_MARKER'),
    },
  });
const FailingWidget = server.widget(
  async () => ({
    default: {},
    render: async () => {
      throw new Error('RENDER_FAILURE');
    },
  }),
  { import: '/failing-widget.js' }
);
const FailingComponent = () =>
  h(FailingWidget, {
    widget: {
      fallback: {
        pending: h('span', null, 'PENDING_BOUNDARY_MARKER'),
        error: h('span', null, 'ERROR_BOUNDARY_MARKER'),
      },
    },
  });

testAdapterConformance({
  runner: { describe, test, expect },
  adapter: {
    name: 'preact',
    server: {
      module: server,
      component: Component,
      data: { message: 'Hello' },
      progressive: 'stream',
      slots: {
        async render() {
          return server.render(
            SlotComponent,
            {},
            {
              progressive: false,
            }
          ) as Promise<string>;
        },
        hostSlot: 'adapter-actions',
        shadowMarker: 'SHADOW_SLOT_MARKER',
        lightMarker: 'LIGHT_SLOT_MARKER',
      },
      pendingBoundary: {
        async render() {
          const browserWindow = globalThis.window;
          vi.stubGlobal('window', undefined);
          try {
            return (await server.render(
              PendingComponent,
              {},
              {
                progressive: false,
              }
            )) as string;
          } finally {
            vi.stubGlobal('window', browserWindow);
          }
        },
        marker: 'PENDING_BOUNDARY_MARKER',
      },
      errorFallback: {
        component: FailingComponent,
        marker: 'ERROR_BOUNDARY_MARKER',
      },
      assertRendered(_result, { text }) {
        expect(text).toContain('<p>Hello</p>');
      },
    },
    client: {
      module: client,
      component: Component,
      data: { message: 'Hello' },
      createContainer: () => document.createElement('div'),
      assertMounted(container) {
        expect(container.textContent).toBe('Hello');
      },
      assertUnmounted(container) {
        expect(container.textContent).toBe('');
      },
    },
  },
});
