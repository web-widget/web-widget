import url from 'node:url';
import path from 'node:path';
import * as compiler from 'vue/compiler-sfc';
import vue2Plugin from '@vitejs/plugin-vue2';
import vue2WebWidgetPlugin from '@web-widget/vue2/vite';
import { normalizePath } from 'vite';

const encode = (string: string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const workspace = normalizePath(
  path.join(path.dirname(url.fileURLToPath(import.meta.url)), path.sep)
);

export function vue2PresetsPlugin() {
  return [
    vue2Plugin({
      compiler,
      include: new RegExp(`^${encode(workspace)}.*\\.vue$`),
    }),
    vue2WebWidgetPlugin({
      workspace,
    }),
  ];
}
