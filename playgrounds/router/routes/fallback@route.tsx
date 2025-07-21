import {
  defineRouteHandler,
  defineRouteComponent,
  defineRouteFallbackComponent,
  type RouteFallbackComponentProps,
} from '@web-widget/helpers';
import { createHttpError } from '@web-widget/helpers/error';
import BaseLayout from './(components)/BaseLayout';

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
      <h1>❌{error.name}</h1>
      <h2>{error.message}</h2>
    </BaseLayout>
  );
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Error handling</h1>
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
