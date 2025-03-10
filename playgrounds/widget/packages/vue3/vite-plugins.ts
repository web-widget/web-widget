import url from 'node:url';
import path from 'node:path';
import vuePlugin from '@vitejs/plugin-vue';
import vue3WebWidgetPlugin from '@web-widget/vue/vite';
import { Manifest } from 'vite';

const dirname = path.join(
  path.dirname(url.fileURLToPath(import.meta.url)),
  path.sep
);
const vue2Dir = path.join(dirname, '..', 'vue2');
const encode = (string: string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exclude = new RegExp(`^${encode(path.join(vue2Dir, path.sep))}.*$`);

export function vuePresetsPlugin(manifest?: Manifest) {
  return [
    vuePlugin({
      exclude,
    }),
    vue3WebWidgetPlugin({
      manifest,
      export: {
        exclude,
      },
      import: {
        includeImporter: exclude,
      },
    }),
  ];
}
