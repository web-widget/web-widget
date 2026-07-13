import { defineRouteComponent, defineRouteHandler } from '@web-widget/helpers';
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
    return ctx.html();
  },
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Background tasks</h1>
      <p>
        Work can continue in the background after the response is sent. Check
        the terminal log to see the delayed task output.
      </p>
    </BaseLayout>
  );
});
