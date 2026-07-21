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
  { import: '/slotted-widget.js', root: 'shadow' }
);
const SlotComponent = () =>
  createComponent(SlottedWidget, {
    slot: 'adapter-actions',
    get children() {
      return createComponent(Dynamic, {
        component: 'span',
        slot: 'label',
        children: 'LIGHT_SLOT_MARKER',
      });
    },
  });

const NestedSlotComponent = () =>
  createComponent(SlottedWidget, {
    get children() {
      return createComponent(SlottedWidget, {
        slot: 'adapter-actions',
      });
    },
  });

const InvalidLightChildrenWidget = server.widget(
  async () => ({ default: {}, render: async () => '<p>widget</p>' }),
  { import: '/light-widget.js' }
);
const InvalidLightChildrenComponent = () =>
  createComponent(InvalidLightChildrenWidget, {
    children: 'LIGHT_CHILDREN',
  });

async function readStream(stream: ReadableStream<string>): Promise<string> {
  let text = '';
  for await (const chunk of stream) text += chunk;
  return text;
}

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
        hostSlot: 'adapter-actions',
        shadowMarker: 'SHADOW_SLOT_MARKER',
        lightMarker: 'LIGHT_SLOT_MARKER',
      },
      assertRendered(_result, { text }) {
        expect(text).toContain('Hello');
      },
    },
  },
});

test('preserves a nested Widget host during progressive rendering', async () => {
  const result = await server.render(
    NestedSlotComponent,
    {},
    { id: 'nested-slot', progressive: true }
  );
  const text = await readStream(result as ReadableStream<string>);

  expect(text).toMatch(/<web-widget[^>]*slot="adapter-actions"/);
});

test('rejects children for a Light Target Widget', async () => {
  await expect(
    server.render(InvalidLightChildrenComponent, {}, { progressive: false })
  ).rejects.toThrow(
    `Rendering content in a slot requires "options.root = 'shadow'".`
  );
});
