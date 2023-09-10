import WebRouter from "@web-widget/web-router";
import type { Manifest, StartOptions } from "@web-widget/web-router";
import type { ReactRenderOptions } from "@web-widget/react";

export default (manifest: Manifest, options: StartOptions) => {
  return new WebRouter(manifest, {
    ...options,
    defaultMeta: {
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
      ...options.defaultMeta,
    },
    async experimental_render(context, render) {
      const url = new URL(context.request.url);
      const isCrawler = url.searchParams.has("debug-await-all-ready");
      if (isCrawler) {
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
