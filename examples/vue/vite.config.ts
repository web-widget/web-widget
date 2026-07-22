/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import reactPlugin from '@vitejs/plugin-react';
import vuePlugin from '@vitejs/plugin-vue';
import reactTransform from '@web-widget/react/transform';
import vueTransform from '@web-widget/vue/transform';
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
    reactPlugin(),
    vuePlugin(),
    webWidgetPlugin({
      transforms: [reactTransform, vueTransform],
    }),
  ],
  build: {
    target: ['chrome76'],
  },
});
