/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
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

export default defineConfig({
  future: {
    removePluginHookHandleHotUpdate: 'warn',
    removePluginHookSsrArgument: 'warn',
    removeServerModuleGraph: 'warn',
    removeServerReloadModule: 'warn',
    removeServerPluginContainer: 'warn',
    removeServerHot: 'warn',
    removeServerTransformRequest: 'warn',
    removeServerWarmupRequest: 'warn',
    removeSsrLoadModule: 'warn',
  },
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
    globalSetup: './test/global-setup.ts',
  },
  preview: {
    open: true,
    headers: {
      'x-server-mode': 'preview',
    },
  },
});
