/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import vuePlugin from '@vitejs/plugin-vue';
import { webRouterPlugin, webWidgetPlugin } from '@web-widget/vite-plugin';

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
    react(),
    vuePlugin(),
    webWidgetPlugin({
      adapters: ['@web-widget/react', '@web-widget/vue'],
    }),
  ],
  build: {
    target: ['chrome76'],
  },
});
