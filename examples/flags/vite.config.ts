/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { webRouterPlugin } from '@web-widget/vite-plugin';
import reactWebWidgetPlugin from '@web-widget/react/vite';
import { builtinModules } from 'module';

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
    [react(), reactWebWidgetPlugin()],
  ],
  build: {
    target: ['chrome76'],
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map((module) => `node:${module}`),
      ],
    },
  },
  ssr: {
    target: 'node',
  },
  test: {
    api: {
      port: Number(process.env.TEST_PORT ?? 51207),
      strictPort: true,
    },
  },
});
