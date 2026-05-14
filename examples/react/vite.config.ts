/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { cloudflarePool } from '@cloudflare/vitest-pool-workers';
import react from '@vitejs/plugin-react';
import { webRouterPlugin } from '@web-widget/vite-plugin';
import reactWebWidgetPlugin from '@web-widget/react/vite';
import vuePlugin from '@vitejs/plugin-vue';
import vueWebWidgetPlugin from '@web-widget/vue/vite';

export default defineConfig({
  plugins: [
    webRouterPlugin({
      asyncContext: {
        enabled: false,
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
    [reactWebWidgetPlugin(), react()],
    [vuePlugin(), vueWebWidgetPlugin()],
  ],
  build: {
    target: ['chrome76'],
  },
  test: {
    pool: cloudflarePool({
      miniflare: {
        compatibilityDate: '2026-05-14',
        compatibilityFlags: ['nodejs_compat'],
        bindings: {
          TEST_PORT: Number(process.env.TEST_PORT ?? 51204),
        },
        modules: true,
      },
    }),
    api: {
      port: Number(process.env.TEST_PORT ?? 51204),
      strictPort: true,
    },
  },
});
