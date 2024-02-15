import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { webRouterPlugin } from '@web-widget/vite';
import reactWebWidgetPlugin from '@web-widget/react/vite';
import vuePlugin from '@vitejs/plugin-vue';
import vue3WebWidgetPlugin from '@web-widget/vue/vite';

export default defineConfig({
  plugins: [
    webRouterPlugin({
      filesystemRouting: {
        enabled: true,
      },
    }),
    [react(), reactWebWidgetPlugin()],
    [vuePlugin(), vue3WebWidgetPlugin()],
  ],
  build: {
    target: ['chrome76'],
  },
});
