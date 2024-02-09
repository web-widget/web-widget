import { type ReactRenderOptions } from '@web-widget/react';
import { defineMiddlewareHandler } from '@web-widget/helpers';

export const handler = defineMiddlewareHandler(
  async function handler(ctx, next) {
    const isSpider = /spider|bot/i.test(
      String(ctx.request.headers.get('User-Agent'))
    );
    const isDebugSpider = new URL(ctx.request.url).searchParams.has(
      'debug-spider'
    );

    if (isSpider || isDebugSpider) {
      console.log('spider..');
      if (ctx.renderOptions) {
        ctx.renderOptions = Object.assign(ctx.renderOptions, {
          react: {
            awaitAllReady: true,
          },
        } as ReactRenderOptions);
      }
    }

    return next();
  }
);
