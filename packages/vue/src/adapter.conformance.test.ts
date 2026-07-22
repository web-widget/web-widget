import { describe, expect, test } from 'vitest';
import { defineComponent, h } from 'vue';
import { testAdapterConformance } from '@web-widget/schema/testing';
import * as server from './adapter.server';
import * as client from './adapter.client';

const Component = defineComponent({
  props: { message: { type: String, required: true } },
  setup: (props) => () => h('p', props.message),
});
const SlottedWidget = server.widget(
  async () => ({
    default: {},
    render: async () => '<slot name="label">SHADOW_SLOT_MARKER</slot>',
  }),
  { import: '/slotted-widget.js', root: 'shadow' }
);
const SlotComponent = defineComponent({
  setup: () => () =>
    h(
      SlottedWidget,
      { slot: 'adapter-actions' },
      {
        default: () => h('span', { slot: 'label' }, 'LIGHT_SLOT_MARKER'),
      }
    ),
});
const PendingWidget = server.widget(async () => ({ default: {} }), {
  import: '/pending-widget.js',
  root: 'shadow',
});
const PendingComponent = defineComponent({
  setup: () => () =>
    h(PendingWidget, {
      widget: {
        clientOnly: true,
        fallback: h('span', 'PENDING_BOUNDARY_MARKER'),
      },
    }),
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
const FailingComponent = defineComponent({
  setup: () => () =>
    h(FailingWidget, {
      widget: {
        fallback: {
          pending: h('span', 'PENDING_BOUNDARY_MARKER'),
          error: h('span', 'ERROR_BOUNDARY_MARKER'),
        },
      },
    }),
});

testAdapterConformance({
  runner: { describe, test, expect },
  adapter: {
    name: 'vue',
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
          return server.render(
            PendingComponent,
            {},
            {
              progressive: false,
            }
          ) as Promise<string>;
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
