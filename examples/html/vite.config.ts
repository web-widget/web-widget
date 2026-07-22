/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import reactPlugin from '@vitejs/plugin-react';
import vuePlugin from '@vitejs/plugin-vue';
import htmlTransform from '@web-widget/html/transform';
import reactTransform from '@web-widget/react/transform';
import vueTransform from '@web-widget/vue/transform';
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
      transforms: [htmlTransform, reactTransform, vueTransform],
    }),
  ],
  build: {
    target: ['chrome76'],
  },
});
