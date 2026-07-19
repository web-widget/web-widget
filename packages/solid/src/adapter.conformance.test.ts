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

testAdapterConformance({
  runner: { describe, test, expect },
  adapter: {
    name: 'solid',
    server: {
      module: server,
      component: Component,
      data: { message: 'Hello' },
      progressive: 'stream',
      assertRendered(_result, { text }) {
        expect(text).toContain('Hello');
      },
    },
  },
});
