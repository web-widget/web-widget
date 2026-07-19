import { describe, expect, test } from 'vitest';
import { testAdapterConformance } from '@web-widget/schema/testing';
import * as adapter from './adapter';
import { html } from './html';

testAdapterConformance({
  runner: { describe, test, expect },
  adapter: {
    name: 'html',
    server: {
      module: adapter,
      component: ({ message }: { message: string }) => html`<p>${message}</p>`,
      data: { message: 'Hello' },
      progressive: 'stream',
      assertRendered(_result, { text }) {
        expect(text).toContain('<p>Hello</p>');
      },
    },
  },
});
