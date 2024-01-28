import { defineRouteComponent, defineRouteHandler } from '@web-widget/react';
import BaseLayout from './(components)/BaseLayout';

export const handler = defineRouteHandler({
  async GET(ctx) {
    const resp = await ctx.render();
    resp.headers.set('X-Custom-Header', 'Hello');
    resp.headers.set('X-Route-name', ctx.name || '');
    return resp;
  },
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Custom handlers</h1>
      <p>
        Please open the web inspection pane of your browser's developer tools.
      </p>
    </BaseLayout>
  );
});
