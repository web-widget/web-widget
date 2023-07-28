import {
  render,
  defineRouteHandler,
  createHttpError,
  RouteFallbackComponentProps,
} from "@web-widget/react";

export { render };

export const handler = defineRouteHandler({
  async GET(ctx) {
    const url = new URL(ctx.request.url);

    if (url.searchParams.has("404")) {
      return ctx.render({
        error: createHttpError(404, "😔 页面找不到了"),
      });
    }

    if (url.searchParams.has("500")) {
      return ctx.render({
        error: createHttpError(500),
      });
    }

    if (url.searchParams.has("globa-500")) {
      throw new Error("⚠️ 全局错误捕获 500");
    }

    if (url.searchParams.has("globa-404")) {
      throw createHttpError(404, "⚠️ 全局错误捕获 404");
    }

    return ctx.render();
  },
});

export function fallback(error: RouteFallbackComponentProps) {
  return (
    <>
      <h1>❌{error.name}</h1>
      <h2>{error.message}</h2>
    </>
  );
}

export default function Page() {
  return (
    <>
      <h1>Error handling</h1>
      <ul>
        <li>
          <a href="?404">Show 404 error</a>
        </li>
        <li>
          <a href="?500">Show 500 error</a>
        </li>
        <li>
          <a href="?globa-404">Show globa 404 error</a>
        </li>
        <li>
          <a href="?globa-500">Show globa 500 error</a>
        </li>
      </ul>
    </>
  );
}
