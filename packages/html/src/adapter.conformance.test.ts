import { describe, expect, test } from 'vitest';
import { testAdapterConformance } from '@web-widget/schema/testing';
import * as adapter from './adapter';
import { html } from './html';

const SHADOW_MARKER = 'SHADOW_SLOT_MARKER';
const LIGHT_MARKER = 'LIGHT_SLOT_MARKER';
const RENDER_MODE_MARKER = 'RENDER_MODE_MARKER';
const SlottedWidget = adapter.widget(
  async () => ({
    default: {},
    render: async () => `<slot name="label">${SHADOW_MARKER}</slot>`,
  }),
  { import: '/slotted-widget.js', root: 'shadow' }
);
const FailingWidget = adapter.widget(
  async () => ({
    default: {},
    render: async () => {
      throw new Error('RENDER_FAILURE');
    },
  }),
  { import: '/failing-widget.js' }
);
const FailingComponent = () =>
  html`${FailingWidget({
    widget: {
      fallback: {
        pending: html`<span>PENDING_BOUNDARY_MARKER</span>`,
        error: html`<span>ERROR_BOUNDARY_MARKER</span>`,
      },
    },
  })}`;
const RenderModeWidget = adapter.widget(
  async () => ({
    default: {},
    render: async () => `<p>${RENDER_MODE_MARKER}</p>`,
  }),
  { import: '/render-mode-widget.js' }
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
      errorFallback: {
        component: FailingComponent,
        marker: 'ERROR_BOUNDARY_MARKER',
      },
      renderModes: {
        async render(mode) {
          const widget =
            mode === 'default'
              ? undefined
              : mode === 'serverOnly'
                ? { serverOnly: true as const }
                : { clientOnly: true as const };
          const result = await RenderModeWidget({ widget });
          return result.toString();
        },
        serverMarker: RENDER_MODE_MARKER,
      },
      assertRendered(_result, { text }) {
        expect(text).toContain('<p>Hello</p>');
      },
    },
  },
});
