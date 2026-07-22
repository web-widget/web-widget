/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import reactTransform from '@web-widget/react/transform';
import { webRouterPlugin, webWidgetPlugin } from '@web-widget/vite-plugin';
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
    react(),
    webWidgetPlugin({
      transforms: [reactTransform],
    }),
  ],
  build: {
    target: ['chrome76'],
    rolldownOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map((module) => `node:${module}`),
      ],
    },
  },
  ssr: {
    target: 'node',
  },
});
