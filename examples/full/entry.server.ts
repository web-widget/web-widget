import type { ReactRenderOptions } from "@web-widget/react";
import { mergeMeta } from "@web-widget/react";
import type { Manifest, StartOptions } from "@web-widget/web-router";
import WebRouter from "@web-widget/web-router";

export default (manifest: Manifest, options: StartOptions) => {
  return new WebRouter(manifest, {
    ...options,
    defaultMeta: mergeMeta(
      {
        lang: "en",
        meta: [
          {
            charset: "utf-8",
          },
          {
            name: "viewport",
            content: "width=device-width, initial-scale=1.0",
          },
        ],
      },
      options.defaultMeta || {}
    ),
    async experimental_render(context, render) {
      const isSpider = /spider|bot/i.test(
        String(context.request.headers.get("User-Agent"))
      );
      const isDebugSpider = new URL(context.request.url).searchParams.has(
        "debug-spider"
      );

      if (isSpider || isDebugSpider) {
        console.log("spider..");
        const reactRenderOptions: ReactRenderOptions = {
          react: {
            awaitAllReady: true,
          },
        };
        Object.assign(context.renderOptions, reactRenderOptions);
      }
      await render();
    },
  });
};
