import url from 'node:url';
import path from 'node:path';
import vuePlugin from '@vitejs/plugin-vue';
import vue3WebWidgetPlugin from '@web-widget/vue/vite';
import { Manifest } from 'vite';

const dirname = path.join(
  path.dirname(url.fileURLToPath(import.meta.url)),
  path.sep
);
const encode = (string: string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const subFile = (reg = '') =>
  new RegExp(`^${encode(dirname)}${reg}`);

export function vuePresetsPlugin(manifest?: Manifest) {
  return [
    vuePlugin({
      include: subFile('.*\\.vue$'),
    }),
    vue3WebWidgetPlugin({
      manifest,
      export: {
        include: subFile('.*@(:?route|widget)\\.vue(?:\\?.*)?$'),
      },
      import: {
        includeImporter: subFile('.*\\.vue(?:\\?vue&type=script\\b.*)?$'),
      },
    }),
  ];
}
