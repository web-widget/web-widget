import { describe, expect, test } from 'vitest';
import { testAdapterConformance } from '@web-widget/schema/testing';
import * as server from './adapter.server';

const Component = (
  payload: { push(value: string): void },
  { message }: { message: string }
) => {
  payload.push(`<p>${message}</p>`);
};

testAdapterConformance({
  runner: { describe, test, expect },
  adapter: {
    name: 'svelte',
    server: {
      module: server,
      component: Component as any,
      data: { message: 'Hello' },
      progressive: 'buffered',
      assertRendered(_result, { text }) {
        expect(text).toContain('<p>Hello</p>');
      },
    },
  },
});
