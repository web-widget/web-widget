import { describe, expect, test, vi } from 'vitest';
import { testAdapterConformance } from '@web-widget/schema/testing';

vi.mock('solid-js/web', () => ({
  hydrate: (view: Function, container: Element) => {
    container.textContent = String(view());
    return () => (container.textContent = '');
  },
  render: (view: Function, container: Element) => {
    container.textContent = String(view());
    return () => (container.textContent = '');
  },
}));

const client = await import('./adapter.client');
const Component = ({ message }: { message: string }) => message;

testAdapterConformance({
  runner: { describe, test, expect },
  adapter: {
    name: 'solid-client',
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
