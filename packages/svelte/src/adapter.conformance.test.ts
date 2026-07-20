import { describe, expect, test } from 'vitest';
import { testAdapterConformance } from '@web-widget/schema/testing';
import * as server from './adapter.server';

const Component = (
  payload: { push(value: string): void },
  { message }: { message: string }
) => {
  payload.push(`<p>${message}</p>`);
};
const SlottedWidget = server.widget(
  async () => ({
    default: {},
    render: async () => '<slot name="label">SHADOW_SLOT_MARKER</slot>',
  }),
  { import: '/slotted-widget.js', renderTarget: 'shadow' }
);
const SlotComponent = (renderer: any) =>
  SlottedWidget(renderer, {
    children: (child: { push(value: string): void }) =>
      child.push('<span slot="label">LIGHT_SLOT_MARKER</span>'),
  });

testAdapterConformance({
  runner: { describe, test, expect },
  adapter: {
    name: 'svelte',
    server: {
      module: server,
      component: Component as any,
      data: { message: 'Hello' },
      progressive: 'buffered',
      slots: {
        async render() {
          return server.render(
            SlotComponent as any,
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
        expect(text).toContain('<p>Hello</p>');
      },
    },
  },
});
