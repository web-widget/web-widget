import { defineRouteComponent, defineRouteHandler } from '@web-widget/helpers';

export const handler = defineRouteHandler({
  async GET(ctx) {
    return ctx.html(undefined, { renderer: { progressive: true } });
  },
});

/**
 * Shell error demo: the template throws outside any suspense/fallback
 * boundary, so the error is unrecoverable. renderToStream rejects,
 * and the framework returns a 500 response (handled by _500@route.tsx).
 */
export default defineRouteComponent(async function Page() {
  throw new Error('Shell error: rendering failed before any suspense boundary');
});
