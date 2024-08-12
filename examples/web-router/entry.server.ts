import { mergeMeta } from '@web-widget/helpers';
import { meta, manifest } from '@web-widget/helpers/placeholder';
import WebRouter from '@web-widget/web-router';

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
