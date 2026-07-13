import { defineRouteComponent, defineRouteHandler } from '@web-widget/helpers';
import BaseLayout from './(components)/BaseLayout';
import { PageHeader } from './(components)/ui';

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
      <PageHeader
        title="Background tasks"
        description="Work can continue in the background after the response is sent. Check the terminal log to see the delayed task output."
      />
    </BaseLayout>
  );
});
