import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { webRouterPlugin, webWidgetPlugin } from '@web-widget/vite-plugin';

export default defineConfig({
  resolve: {
    alias: {
      '~': import.meta.dirname,
    },
  },
  server: {
    fs: {
      allow: [
        import.meta.dirname,
        process.env.WEB_WIDGET_WORKSPACE_ROOT ?? import.meta.dirname,
      ],
    },
  },
  plugins: [
    webRouterPlugin({
      filesystemRouting: { enabled: true },
    }),
    react(),
    vue(),
    webWidgetPlugin({
      defaults: { renderTarget: 'shadow' },
      adapters: [
        '@web-widget/react',
        { from: '@web-widget/vue', scope: ['widgets'] },
      ],
    }),
  ],
});
