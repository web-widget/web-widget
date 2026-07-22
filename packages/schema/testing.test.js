/* global document */

import { describe, expect, test } from 'vitest';
import { testAdapterConformance } from './testing.js';

const component = (data) => data.message;
const errorComponent = () => '<div>ERROR_FALLBACK_MARKER</div>';
const widget = () => undefined;

testAdapterConformance({
  runner: { describe, test, expect },
  adapter: {
    name: 'fixture',
    server: {
      module: {
        widget,
        render(component, data, { progressive }) {
          if (!component) throw new TypeError('Missing component.');
          const value = component(data ?? {});
          return progressive
            ? new ReadableStream({
                start(controller) {
                  controller.enqueue(new TextEncoder().encode(value));
                  controller.close();
                },
              })
            : value;
        },
      },
      component,
      data: { message: 'Hello' },
      progressive: 'stream',
      errorFallback: {
        component: errorComponent,
        marker: 'ERROR_FALLBACK_MARKER',
      },
      assertRendered(_result, { text }) {
        expect(text).toBe('Hello');
      },
    },
    client: {
      module: {
        widget,
        render(component, data, { container }) {
          if (!component) throw new TypeError('Missing component.');
          if (!container) throw new Error('Missing container.');
          return {
            mount() {
              container.textContent = component(data ?? {});
            },
            unmount() {
              container.textContent = '';
            },
          };
        },
      },
      component,
      data: { message: 'Hello' },
      createContainer: () => document.createElement('div'),
      assertMounted(container) {
        expect(container.textContent).toBe('Hello');
      },
      assertUnmounted(container) {
        expect(container.textContent).toBe('');
      },
      hydration: {
        prepare(container) {
          container.textContent = 'Hello';
        },
        assertRecovered(container) {
          expect(container.textContent).toBe('Hello');
        },
      },
    },
  },
});
