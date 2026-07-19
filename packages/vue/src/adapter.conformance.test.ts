import { describe, expect, test } from 'vitest';
import { defineComponent, h } from 'vue';
import { testAdapterConformance } from '@web-widget/schema/testing';
import * as server from './adapter.server';
import * as client from './adapter.client';

const Component = defineComponent({
  props: { message: { type: String, required: true } },
  setup: (props) => () => h('p', props.message),
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
