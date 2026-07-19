/** @jsxImportSource preact */
import { defineRouteComponent, defineRouteHandler } from '@web-widget/helpers';

export const handler = defineRouteHandler({
  async GET(ctx) {
    return ctx.html(undefined, { renderer: { progressive: true } });
  },
});

// This throw happens before a Suspense boundary can emit its shell.
export default defineRouteComponent(function Page() {
  throw new Error('Shell error: rendering failed before any suspense boundary');
});
