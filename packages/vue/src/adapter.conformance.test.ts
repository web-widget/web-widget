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
