import { mergeMeta } from '@web-widget/helpers';
import WebRouter from '@web-widget/web-router';

const { meta, manifest } = import.meta.framework;

export default WebRouter.fromManifest(manifest, {
  defaultMeta: mergeMeta(meta, {
    lang: 'en',
    meta: [{ charset: 'utf-8' }],
  }),
});
