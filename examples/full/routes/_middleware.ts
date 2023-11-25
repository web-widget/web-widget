import type { Meta, ReactRenderOptions } from "@web-widget/react";
import type { Context } from "@web-widget/web-router";

export async function handler(ctx: Context, next: () => Promise<Response>) {
  const isSpider = /spider|bot/i.test(
    String(ctx.request.headers.get("User-Agent"))
  );
  const isDebugSpider = new URL(ctx.request.url).searchParams.has(
    "debug-spider"
  );

  if (isSpider || isDebugSpider) {
    console.log("spider..");
    ctx.state.renderOptions = {
      react: {
        awaitAllReady: true,
      },
    } as ReactRenderOptions;
  }
  ctx.state.meta = {
    meta: [
      {
        name: "server",
        content: "@web-widget/web-router",
      },
    ],
  } as Meta;
  const resp = await next();
  resp.headers.set("X-Powered-By", "@web-widget/web-router");
  return resp;
}
