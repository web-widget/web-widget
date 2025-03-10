import url from 'node:url';
import path from 'node:path';
import vuePlugin from '@vitejs/plugin-vue';
import vue3WebWidgetPlugin from '@web-widget/vue/vite';

const dirname = path.join(
  path.dirname(url.fileURLToPath(import.meta.url)),
  path.sep
);
const vue2Dir = path.join(dirname, '..', '(vue2)');

const encode = (string: string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exclude = new RegExp(`^${encode(path.join(vue2Dir, path.sep))}.*$`);

export function vuePresetsPlugin() {
  return [
    vuePlugin({
      exclude,
    }),
    vue3WebWidgetPlugin({
      export: {
        exclude,
      },
      import: {
        excludeImporter: exclude,
      },
    }),
  ];
}
