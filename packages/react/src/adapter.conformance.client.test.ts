import { createElement } from 'react';
import { testAdapterConformance } from '@web-widget/schema/testing';
import { vi } from 'vitest';
import * as client from './adapter.client';

vi.mock('react-dom/client', () => ({
  createRoot: (container: { textContent: string }) => ({
    render() {
      container.textContent = 'Hello';
    },
    unmount() {
      container.textContent = '';
    },
  }),
  hydrateRoot: (container: { textContent: string }) => {
    container.textContent = 'Hello';
    return {
      unmount() {
        container.textContent = '';
      },
    };
  },
}));

const Component = ({ message }: { message: string }) =>
  createElement('p', null, message);

testAdapterConformance({
  runner: { describe, test, expect },
  adapter: {
    name: 'react-client',
    client: {
      module: client,
      component: Component as any,
      data: { message: 'Hello' },
      createContainer: () => ({ textContent: '' }) as unknown as Element,
      assertMounted(container) {
        expect(container.textContent).toBe('Hello');
      },
      assertUnmounted(container) {
        expect(container.textContent).toBe('');
      },
      hydration: {
        prepare(container) {
          container.textContent = 'Server content';
        },
        assertRecovered(container) {
          expect(container.textContent).toBe('Hello');
        },
      },
    },
  },
});
