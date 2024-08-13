import { mergeMeta } from '@web-widget/helpers';
import WebRouter from '@web-widget/web-router';
import { meta, manifest } from '@placeholder';

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
    react: {
      awaitAllReady: true,
    },
  },
});
