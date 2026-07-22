import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import reactTransform from '@web-widget/react/transform';
import vueTransform from '@web-widget/vue/transform';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { webRouterPlugin, webWidgetPlugin } from '@web-widget/vite-plugin';

function watcherProbePlugin(): Plugin {
  const versions = new Map<string, number>();

  return {
    name: 'shadow-router-watcher-probe',
    configureServer(server) {
      server.watcher.on('change', (file) => {
        const relative = path
          .relative(server.config.root, file)
          .split(path.sep)
          .join('/');
        versions.set(relative, (versions.get(relative) ?? 0) + 1);
      });
      server.middlewares.use('/__integration/watcher', (request, response) => {
        const url = new URL(request.url ?? '/', 'http://integration.test');
        const file = url.searchParams.get('file') ?? '';
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ version: versions.get(file) ?? 0 }));
      });
    },
  };
}

export default defineConfig({
  // node_modules is shared through a symlink, so Vite's default cache path
  // would let concurrent temporary fixtures invalidate each other's optimizer.
  cacheDir: '.vite',
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
    watcherProbePlugin(),
    webRouterPlugin({
      filesystemRouting: { enabled: true },
    }),
    react(),
    vue(),
    webWidgetPlugin({
      defaults: { root: 'shadow' },
      transforms: [reactTransform, { ...vueTransform, scope: ['widgets'] }],
    }),
  ],
});
