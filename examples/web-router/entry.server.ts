import { mergeMeta } from '@web-widget/react';
import type { Manifest, StartOptions } from '@web-widget/web-router';
import WebRouter from '@web-widget/web-router';

export default (manifest: Manifest, options: StartOptions) => {
  return WebRouter.fromManifest(manifest, {
    ...options,
    defaultMeta: mergeMeta(
      {
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
      },
      options.defaultMeta || {}
    ),
  });
};
