import url from 'node:url';
import path from 'node:path';
import * as compiler from 'vue/compiler-sfc';
import vue2Plugin from '@vitejs/plugin-vue2';
import vue2WebWidgetPlugin from '@web-widget/vue2/vite';

const dirname = path.join(
  path.dirname(url.fileURLToPath(import.meta.url)),
  path.sep
);

const vue3Dir = path.join(dirname, '..', '(vue3)');
const encode = (string: string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exclude = new RegExp(`^${encode(path.join(vue3Dir, path.sep))}.*$`);

export function vue2PresetsPlugin() {
  return [
    vue2Plugin({
      compiler,
      exclude,
    }),
    vue2WebWidgetPlugin({
      export: {
        exclude,
      },
      import: {
        excludeImporter: exclude,
      },
    }),
  ];
}
