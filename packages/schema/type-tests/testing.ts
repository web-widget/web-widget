import type { ServerRender } from '../schema';
import { testAdapterConformance, type ConformanceRunner } from '../testing';

const runner = {} as ConformanceRunner;
const render = (async (_component, data) =>
  data.message) satisfies ServerRender<
  (data: { message: string }) => string,
  { message: string }
>;

testAdapterConformance({
  runner,
  adapter: {
    name: 'typed-fixture',
    server: {
      module: { render, widget: () => undefined },
      component: ({ message }) => message,
      data: { message: 'Hello' },
      progressive: 'buffered',
      assertRendered(_result, context) {
        const text: string = context.text;
        void text;
      },
    },
  },
});
