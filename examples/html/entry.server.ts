import {
  mergeMeta,
  MiddlewareHandler,
  MiddlewareHandlers,
} from '@web-widget/helpers';
import WebRouter from '@web-widget/web-router';
const { meta, manifest } = import.meta.framework;

function use(
  pathname: string,
  handler: MiddlewareHandler | MiddlewareHandlers
) {
  manifest.middlewares.push({
    pathname,
    module: {
      handler,
    },
  });
}

use('*', async function poweredBy(ctx, next) {
  ctx.state.test = 'hello world';
  const resp = await next();
  resp.headers.set('X-Powered-By', '@web-widget/web-router');

  return resp;
});

export default WebRouter.fromManifest(manifest, {
  defaultMeta: mergeMeta(meta, {
    lang: 'en',
    meta: [
      {
        charset: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1.0',
      },
    ],
  }),
  defaultRenderOptions: {
    progressive: false,
  },
});
