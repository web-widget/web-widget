import { describe, expect, test } from 'vitest';
import { testAdapterConformance } from '@web-widget/schema/testing';
import * as server from './adapter.server';
import * as client from './adapter.client';

const Component = {
  props: ['message'],
  render(this: { message: string }, h: Function) {
    return h('p', this.message);
  },
};
const SlottedWidget = server.widget(
  async () => ({
    default: {},
    render: async () => '<slot name="label">SHADOW_SLOT_MARKER</slot>',
  }),
  { import: '/slotted-widget.js', renderTarget: 'shadow' }
);
const SlotComponent = {
  render(h: Function) {
    return h(SlottedWidget, [
      h('span', { attrs: { slot: 'label' } }, 'LIGHT_SLOT_MARKER'),
    ]);
  },
};

testAdapterConformance({
  runner: { describe, test, expect },
  adapter: {
    name: 'vue2',
    server: {
      module: server,
      component: Component,
      data: { message: 'Hello' },
      progressive: 'buffered',
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
        shadowMarker: 'SHADOW_SLOT_MARKER',
        lightMarker: 'LIGHT_SLOT_MARKER',
      },
      assertRendered(_result, { text }) {
        expect(text).toContain('<p');
        expect(text).toContain('Hello');
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
