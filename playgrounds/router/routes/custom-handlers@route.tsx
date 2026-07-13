import { defineRouteComponent, defineRouteHandler } from '@web-widget/helpers';
import BaseLayout from './(components)/BaseLayout';
import { PageHeader } from './(components)/ui';

export const handler = defineRouteHandler({
  async GET(ctx) {
    const resp = await ctx.html();
    resp.headers.set('X-Custom-Header', 'Hello');
    resp.headers.set('X-Route-name', ctx.name || '');
    return resp;
  },
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <PageHeader
        title="Custom handlers"
        description="This route uses a custom handler to control the HTTP response directly. Open the Network tab in DevTools to inspect the response headers."
      />
    </BaseLayout>
  );
});
