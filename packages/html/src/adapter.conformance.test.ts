import { describe, expect, test } from 'vitest';
import { testAdapterConformance } from '@web-widget/schema/testing';
import * as adapter from './adapter';
import { html } from './html';

const SHADOW_MARKER = 'SHADOW_SLOT_MARKER';
const LIGHT_MARKER = 'LIGHT_SLOT_MARKER';
const SlottedWidget = adapter.widget(
  async () => ({
    default: {},
    render: async () => `<slot name="label">${SHADOW_MARKER}</slot>`,
  }),
  { import: '/slotted-widget.js', renderTarget: 'shadow' }
);

testAdapterConformance({
  runner: { describe, test, expect },
  adapter: {
    name: 'html',
    server: {
      module: adapter,
      component: ({ message }: { message: string }) => html`<p>${message}</p>`,
      data: { message: 'Hello' },
      progressive: 'stream',
      slots: {
        async render() {
          const result = await SlottedWidget({
            children: html`<span slot="label">${LIGHT_MARKER}</span>`,
            slot: 'adapter-actions',
          });
          return result.toString();
        },
        hostSlot: 'adapter-actions',
        shadowMarker: SHADOW_MARKER,
        lightMarker: LIGHT_MARKER,
      },
      assertRendered(_result, { text }) {
        expect(text).toContain('<p>Hello</p>');
      },
    },
  },
});
