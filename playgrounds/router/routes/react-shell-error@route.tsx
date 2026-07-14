import { defineRouteComponent, defineRouteHandler } from '@web-widget/helpers';

export const handler = defineRouteHandler({
  async GET(ctx) {
    return ctx.html(undefined, { renderer: { progressive: true } });
  },
});

/**
 * Shell error demo: the component throws outside any <Suspense> boundary,
 * so the error is unrecoverable. React's renderToReadableStream rejects,
 * and the framework returns a 500 response (handled by _500@route.tsx).
 */
export default defineRouteComponent(function Page() {
  throw new Error('Shell error: rendering failed before any Suspense boundary');
});
