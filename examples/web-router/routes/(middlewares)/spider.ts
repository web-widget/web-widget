import { type ReactRenderOptions } from '@web-widget/react';
import { defineMiddlewareHandler } from '@web-widget/helpers';

export const handler = defineMiddlewareHandler({
  async GET(ctx, next) {
    const isSpider = /spider|bot/i.test(
      String(ctx.request.headers.get('User-Agent'))
    );

    if (isSpider) {
      if (ctx?.config?.renderOptions) {
        Object.assign(ctx.config.renderOptions, {
          react: {
            awaitAllReady: true,
          },
        } as ReactRenderOptions);
      }
    }

    return next();
  },
});
