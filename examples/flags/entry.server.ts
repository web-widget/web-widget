import { mergeMeta } from '@web-widget/helpers';
import WebRouter from '@web-widget/web-router';
import middleware from './routes/(middlewares)/global';
const { meta, manifest } = import.meta.framework;

manifest.middlewares.unshift({
  pathname: '/*',
  module: {
    handler: middleware,
  },
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
