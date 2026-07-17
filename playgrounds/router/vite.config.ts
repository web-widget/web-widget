/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import solid from 'vite-plugin-solid';
import type { Plugin } from 'vite';
import { htmlCompress } from '@web-widget/html/vite-plugin';
import { webRouterPlugin, webWidgetPlugin } from '@web-widget/vite-plugin';
import { vue2PresetsPlugin } from './routes/(vue2)/vite-plugins';
import { vuePresetsPlugin } from './routes/(vue3)/vite-plugins';

Reflect.defineProperty(global, 'window', {
  set(value) {
    console.trace('window =', value);
  },
});

function reactPresetsPlugin() {
  return [react()];
}

function solidPresetsPlugin(): Plugin {
  const plugin = solid({
    include: [/routes\/frameworks\/solid\/.+\.[jt]sx$/],
    ssr: true,
  });
  const transform = plugin.transform;

  if (typeof transform !== 'function') {
    throw new TypeError(
      'Expected vite-plugin-solid to expose a transform hook.'
    );
  }

  return {
    ...plugin,
    transform(code, id, options) {
      return transform.call(this, code, id, {
        ...options,
        moduleType: options?.moduleType ?? 'tsx',
        ssr: this.environment.config.consumer === 'server',
      });
    },
  };
}

export default defineConfig(({ command }) => ({
  resolve: {
    alias: {
      '~': import.meta.dirname,
    },
  },
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
      conditions: ['node', 'import', 'module', 'default'],
    },
  },
  plugins: [
    htmlCompress(),
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
    svelte({
      compilerOptions: {
        // A parent process may leave NODE_ENV=development set for `vite build`.
        // Keep development-only SSR instrumentation out of production bundles.
        dev: command === 'serve',
      },
    }),
    solidPresetsPlugin(),
    webWidgetPlugin({
      defaults: {
        renderTarget: 'light', // light | shadow
      },
      adapters: [
        '@web-widget/html',
        '@web-widget/react',
        { from: '@web-widget/vue', scope: ['routes/(vue3)'] },
        { from: '@web-widget/vue2', scope: ['routes/(vue2)'] },
        '@web-widget/svelte',
        {
          from: '@web-widget/solid',
          scope: ['routes/frameworks/solid'],
        },
        {
          from: '@web-widget/preact',
          scope: ['routes/frameworks/preact'],
        },
        '@web-widget/web-components',
        '@web-widget/lit',
      ],
    }),
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
}));
