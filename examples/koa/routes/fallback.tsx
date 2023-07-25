import {
  render,
  defineRouteHandler,
  createHttpError,
  RouteFallbackComponentProps,
} from "@web-widget/react";

export { render };

export const handler = defineRouteHandler({
  async GET(req, ctx) {
    const url = new URL(req.url);

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

    if (url.searchParams.has("globa")) {
      throw new Error("⚠️ 内部错误");
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

export default function () {
  return (
    <>
      <p>
        <a href="?404">Show 404 error</a> | <a href="?500">Show 500 error</a> |{" "}
        <a href="?globa">Show globa error</a>
      </p>
    </>
  );
}
