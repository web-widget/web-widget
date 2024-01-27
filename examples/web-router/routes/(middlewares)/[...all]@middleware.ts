import {
  mergeMeta,
  defineMiddlewareHandler,
  type ReactRenderOptions,
} from "@web-widget/react";

export const handler = defineMiddlewareHandler(
  async function handler(ctx, next) {
    const isSpider = /spider|bot/i.test(
      String(ctx.request.headers.get("User-Agent"))
    );
    const isDebugSpider = new URL(ctx.request.url).searchParams.has(
      "debug-spider"
    );

    if (isSpider || isDebugSpider) {
      console.log("spider..");
      if (ctx.renderOptions) {
        ctx.renderOptions = Object.assign(ctx.renderOptions, {
          react: {
            awaitAllReady: true,
          },
        } as ReactRenderOptions);
      }
    }

    if (ctx.meta) {
      ctx.meta = mergeMeta(ctx.meta, {
        meta: [
          {
            name: "server",
            content: "@web-widget/web-router",
          },
        ],
      });
    }

    const resp = await next();
    resp.headers.set("X-Powered-By", "@web-widget/web-router");
    return resp;
  }
);
