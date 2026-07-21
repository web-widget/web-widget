import { describe, expect, test } from 'vitest';
import { testAdapterConformance } from '@web-widget/schema/testing';
import * as server from './adapter.server';
import * as client from './adapter.client';

class Component extends HTMLElement {
  static tagName = 'conformance-element-fixture';
  message = '';
  connectedCallback() {
    this.textContent = this.message;
  }
}

testAdapterConformance({
  runner: { describe, test, expect },
  adapter: {
    name: 'web-components',
    server: {
      module: server,
      component: Component,
      data: { message: 'Hello' },
      progressive: 'none',
      assertRendered() {},
    },
    client: {
      module: client,
      component: Component,
      data: { message: 'Hello' },
      createContainer() {
        const container = document.createElement('div');
        document.body.append(container);
        return container;
      },
      assertMounted(container) {
        expect(container.textContent).toBe('Hello');
      },
      assertUnmounted(container) {
        expect(container.textContent).toBe('');
      },
    },
  },
});
