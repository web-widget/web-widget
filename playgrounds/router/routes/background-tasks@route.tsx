import { defineRouteComponent, defineRouteHandler } from '@web-widget/react';
import BaseLayout from './(components)/BaseLayout';

export const handler = defineRouteHandler({
  async GET(ctx) {
    ctx.waitUntil(
      new Promise((resolve) =>
        setTimeout(() => {
          console.log('Background task completed');
          resolve(undefined);
        }, 1000)
      )
    );
    return ctx.render();
  },
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Background tasks</h1>
      <p>Please check the terminal log.</p>
    </BaseLayout>
  );
});
