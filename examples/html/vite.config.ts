/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import reactPlugin from '@vitejs/plugin-react';
import vuePlugin from '@vitejs/plugin-vue';
import { webRouterPlugin, webWidgetPlugin } from '@web-widget/vite-plugin';
import { htmlCompress } from '@web-widget/html/vite-plugin';

export default defineConfig({
  plugins: [
    webRouterPlugin({
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
    htmlCompress(),
    reactPlugin(),
    vuePlugin(),
    webWidgetPlugin({
      adapters: ['@web-widget/html', '@web-widget/react', '@web-widget/vue'],
    }),
  ],
  build: {
    target: ['chrome76'],
  },
});
