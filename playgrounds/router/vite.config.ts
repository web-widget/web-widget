/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { webRouterPlugin } from '@web-widget/vite-plugin';
import reactWebWidgetPlugin from '@web-widget/react/vite';
import { vue2PresetsPlugin } from './routes/(vue2)/vite-plugins';
import { vuePresetsPlugin } from './routes/(vue3)/vite-plugins';
import { vueCoexistencePlugins } from './vite-plugins/vue-coexistence';

Reflect.defineProperty(global, 'window', {
  set(value) {
    console.trace('window =', value);
  },
});

function reactPresetsPlugin() {
  return [reactWebWidgetPlugin(), react()];
}

export default defineConfig({
  // Node Koa server (`server.js`) — avoid treating all Node built-ins as Rolldown
  // externals (breaks CJS deps such as vue-server-renderer under ESM output).
  ssr: {
    target: 'node',
    // Keep SSR package resolution ESM-first under Vite 8 module runner.
    resolve: {
      conditions: ['import', 'module', 'default'],
    },
  },
  plugins: [
    ...vueCoexistencePlugins([
      {
        packageJsonId: '@playgrounds/web-router-vue3/package.json',
        runtimeImportId: 'vue/dist/vue.runtime.esm-bundler.js',
        runtimeSubpath: 'dist/vue.runtime.esm-bundler.js',
        importerIncludes: ['/routes/(vue3)/', '/packages/vue/'],
      },
      {
        packageJsonId: '@playgrounds/web-router-vue2/package.json',
        runtimeImportId: 'vue/dist/vue.runtime.esm.js',
        runtimeSubpath: 'dist/vue.runtime.esm.js',
        importerIncludes: ['/routes/(vue2)/', '/packages/vue2/'],
      },
    ]),
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
    vue2PresetsPlugin(),
    vuePresetsPlugin(),
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
