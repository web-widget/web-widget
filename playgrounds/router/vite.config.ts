/// <reference types="vitest" />
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { webRouterPlugin } from '@web-widget/vite-plugin';
import reactWebWidgetPlugin from '@web-widget/react/vite';
import { vue2PresetsPlugin } from './routes/(vue2)/vite-plugins';
import { vuePresetsPlugin } from './routes/(vue3)/vite-plugins';

Reflect.defineProperty(global, 'window', {
  set(value) {
    console.trace('window =', value);
  },
});

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
          exclude: ['vue', 'vue-router'],
        },
      };
    },
    async configResolved(config) {
      const alias = config.resolve.alias;
      const dedupe = config.resolve.dedupe;

      if (Array.isArray(dedupe)) {
        // Patch vue3 plugin config.
        // @see https://github.com/vitejs/vite-plugin-vue/blob/main/packages/plugin-vue/src/index.ts#L147
        dedupe.forEach((value, index) => {
          if (value === 'vue') {
            dedupe.splice(index, 1);
          }
        });
      }

      if (Array.isArray(alias)) {
        // Patch vue2 plugin config.
        // @see https://github.com/vitejs/vite-plugin-vue2/blob/main/src/index.ts#L103
        alias.splice(alias.findIndex(({ find }) => find === 'vue'));
      }
    },
  };
}

export default defineConfig({
  plugins: [
    patchVuePluginConfig(),
    webRouterPlugin({
      asyncContext: {
        enabled: true,
      },
      serverAction: {
        enabled: true,
      },
      filesystemRouting: {
        enabled: true,
      },
      importShim: {
        enabled: true,
      },
    }),
    reactPresetsPlugin(),
    vuePresetsPlugin(),
    vue2PresetsPlugin(),
  ],
  build: {
    target: ['chrome76'],
  },
  test: {
    api: {
      port: Number(process.env.TEST_PORT ?? 51204),
      strictPort: true,
    },
  },
  preview: {
    open: true,
    headers: {
      'x-server-mode': 'preview',
    },
  },
});
