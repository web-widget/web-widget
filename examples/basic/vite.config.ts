import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { webRouterPlugin } from '@web-widget/vite-plugin';
import reactWebWidgetPlugin from '@web-widget/react/vite';
import vuePlugin from '@vitejs/plugin-vue';
import vueWebWidgetPlugin from '@web-widget/vue/vite';

export default defineConfig({
  plugins: [
    webRouterPlugin({
      filesystemRouting: {
        enabled: true,
      },
    }),
    [react(), reactWebWidgetPlugin()],
    [vuePlugin(), vueWebWidgetPlugin()],
  ],
  build: {
    target: ['chrome76'],
  },
});
