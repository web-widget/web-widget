import { describe, expect, test } from 'vitest';
import { createComponent } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { testAdapterConformance } from '@web-widget/schema/testing';
import * as server from './adapter.server';

const Component = (props: { message: string }) =>
  createComponent(Dynamic, {
    component: 'p',
    get children() {
      return props.message;
    },
  });
const SlottedWidget = server.widget(
  async () => ({
    default: {},
    render: async () => '<slot name="label">SHADOW_SLOT_MARKER</slot>',
  }),
  { import: '/slotted-widget.js', renderTarget: 'shadow' }
);
const SlotComponent = () =>
  createComponent(SlottedWidget, {
    get children() {
      return createComponent(Dynamic, {
        component: 'span',
        slot: 'label',
        children: 'LIGHT_SLOT_MARKER',
      });
    },
  });

testAdapterConformance({
  runner: { describe, test, expect },
  adapter: {
    name: 'solid',
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
        shadowMarker: 'SHADOW_SLOT_MARKER',
        lightMarker: 'LIGHT_SLOT_MARKER',
      },
      assertRendered(_result, { text }) {
        expect(text).toContain('Hello');
      },
    },
  },
});
