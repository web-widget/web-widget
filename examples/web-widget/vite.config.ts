import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import reactWebWidgetPlugin from '@web-widget/react/vite';
import { vuePresetsPlugin } from './packages/vue3/vite-plugins';
import { vue2PresetsPlugin } from './packages/vue2/vite-plugins';

function reactPresetsPlugin() {
  return [react(), reactWebWidgetPlugin()];
}

function patchVuePluginConfig(): Plugin {
  return {
    name: 'patchVuePluginConfig',
    enforce: 'post',
    async config() {
      return {
        optimizeDeps: {
          // Avoid version conflicts caused by `optimizeDeps`.
          exclude: ['vue'],
        },
      };
    },
    async configResolved(config) {
      const alias = config.resolve.alias;
      const dedupe = config.resolve.dedupe;

      if (dedupe) {
        // Patch vue3 plugin config.
        // @see https://github.com/vitejs/vite-plugin-vue/blob/main/packages/plugin-vue/src/index.ts#L147
        dedupe.splice(dedupe.indexOf('vue'), 1);
      }

      if (alias) {
        // Patch vue2 plugin config.
        // @see https://github.com/vitejs/vite-plugin-vue2/blob/main/src/index.ts#L103
        if (Array.isArray(alias)) {
          alias.splice(alias.findIndex(({ find }) => find === 'vue'));
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [
    patchVuePluginConfig(),
    reactPresetsPlugin(),
    vuePresetsPlugin(),
    vue2PresetsPlugin(),
  ],
  build: {
    minify: false,
    manifest: true,
    target: ['chrome76'],
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'index.html'),
        vue3: path.resolve(__dirname, 'vue3.html'),
        vue2: path.resolve(__dirname, 'vue2.html'),
        react: path.resolve(__dirname, 'react.html'),
      },
    },
  },
});
