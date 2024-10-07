import url from 'node:url';
import path from 'node:path';
import * as compiler from 'vue/compiler-sfc';
import vue2Plugin from '@vitejs/plugin-vue2';
import vue2WebWidgetPlugin from '@web-widget/vue2/vite';
import { Manifest } from 'vite';

const dirname = path.join(
  path.dirname(url.fileURLToPath(import.meta.url)),
  path.sep
);
const encode = (string: string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const subFile = (type = '') =>
  new RegExp(`^${encode(dirname)}.*${type}(?:\\?.*)?$`);

export function vue2PresetsPlugin(manifest?: Manifest) {
  return [
    vue2Plugin({
      compiler,
      include: subFile('\\.vue'),
    }),
    vue2WebWidgetPlugin({
      manifest,
      export: {
        include: subFile('@(?:route|widget)\\.vue'),
      },
      import: {
        includeImporter: subFile('\\.vue'),
      },
    }),
  ];
}
