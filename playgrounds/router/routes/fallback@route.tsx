import {
  defineRouteHandler,
  defineRouteComponent,
  defineRouteFallbackComponent,
  type RouteFallbackComponentProps,
} from '@web-widget/helpers';
import { createHttpError } from '@web-widget/helpers/error';
import BaseLayout from './(components)/BaseLayout';
import { PageHeader, Section } from './(components)/ui';

export const handler = defineRouteHandler({
  async GET(ctx) {
    const url = new URL(ctx.request.url);

    if (url.searchParams.has('404')) {
      return ctx.html(null, {
        error: createHttpError(404, '😔 页面找不到了'),
      });
    }

    if (url.searchParams.has('500')) {
      return ctx.html(null, {
        error: createHttpError(500),
      });
    }

    if (url.searchParams.has('global-500')) {
      throw new Error('⚠️ 全局错误捕获 500');
    }

    if (url.searchParams.has('global-404')) {
      throw createHttpError(404, '⚠️ 全局错误捕获 404');
    }

    return ctx.html();
  },
});

export const fallback = defineRouteFallbackComponent(function (
  error: RouteFallbackComponentProps
) {
  return (
    <BaseLayout>
      <PageHeader title={`❌${error.name}`} />
      <Section>
        <p>{error.message}</p>
      </Section>
    </BaseLayout>
  );
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <PageHeader
        title="Error handling"
        description="When a route fails to render, a fallback UI takes over. Trigger an error below to see the fallback in action."
      />
      <ul>
        <li>
          <a href="?404">Show 404 error</a>
        </li>
        <li>
          <a href="?500">Show 500 error</a>
        </li>
        <li>
          <a href="?global-404">Show global 404 error</a>
        </li>
        <li>
          <a href="?global-500">Show global 500 error</a>
        </li>
      </ul>
    </BaseLayout>
  );
});
