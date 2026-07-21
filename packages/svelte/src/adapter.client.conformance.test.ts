import { describe, expect, test, vi } from 'vitest';
import { testAdapterConformance } from '@web-widget/schema/testing';

vi.mock('svelte', () => ({
  mount: (
    component: Function,
    options: { target: Element; props: unknown }
  ) => {
    options.target.textContent = component(options.props);
    return options.target;
  },
  hydrate: (
    component: Function,
    options: { target: Element; props: unknown }
  ) => {
    options.target.textContent = component(options.props);
    return options.target;
  },
  unmount: (target: Element) => {
    target.textContent = '';
  },
}));

const client = await import('./adapter.client');
const Component = ({ message }: { message: string }) => message;

testAdapterConformance({
  runner: { describe, test, expect },
  adapter: {
    name: 'svelte-client',
    client: {
      module: client,
      component: Component as any,
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
