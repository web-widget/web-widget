import { describe, expect, test } from 'vitest';
import { LitElement, html } from 'lit';
import { testAdapterConformance } from '@web-widget/schema/testing';
import * as server from './adapter.server';
import * as client from './adapter.client';

class Component extends LitElement {
  static tagName = 'conformance-lit-fixture';
  message = '';
  render() {
    return html`<p>${this.message}</p>`;
  }
}

testAdapterConformance({
  runner: { describe, test, expect },
  adapter: {
    name: 'lit',
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
        expect(container.firstElementChild?.shadowRoot?.textContent).toBe(
          'Hello'
        );
      },
      assertUnmounted(container) {
        expect(container.textContent).toBe('');
      },
    },
  },
});
