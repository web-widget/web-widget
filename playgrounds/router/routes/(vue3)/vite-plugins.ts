import url from 'node:url';
import path from 'node:path';
import vue3Plugin from '@vitejs/plugin-vue';
import vue3WebWidgetPlugin from '@web-widget/vue/vite';
import { normalizePath } from 'vite';

const encode = (string: string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const workspace = normalizePath(
  path.join(path.dirname(url.fileURLToPath(import.meta.url)), path.sep)
);

export function vuePresetsPlugin() {
  return [
    vue3Plugin({
      include: new RegExp(`^${encode(workspace)}.*\\.vue$`),
    }),
    vue3WebWidgetPlugin({
      workspace,
    }),
  ];
}
