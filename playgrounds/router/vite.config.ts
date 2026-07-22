/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import solid from 'vite-plugin-solid';
import type { Plugin } from 'vite';
import { htmlCompress } from '@web-widget/html/vite-plugin';
import { webRouterPlugin, webWidgetPlugin } from '@web-widget/vite-plugin';
import htmlTransform from '@web-widget/html/transform';
import litTransform from '@web-widget/lit/transform';
import preactTransform from '@web-widget/preact/transform';
import reactTransform from '@web-widget/react/transform';
import solidTransform from '@web-widget/solid/transform';
import svelteTransform from '@web-widget/svelte/transform';
import vueTransform from '@web-widget/vue/transform';
import vue2Transform from '@web-widget/vue2/transform';
import webComponentsTransform from '@web-widget/web-components/transform';
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
    include: [
      /routes\/\(components\)\/solid\/.+\.[jt]sx$/,
      /routes\/frameworks\/solid\/.+\.[jt]sx$/,
      /routes\/shadow-dom\/solid\/.+\.[jt]sx$/,
      /routes\/streaming\/solid\/.+\.[jt]sx$/,
    ],
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
        root: 'light', // light | shadow
      },
      transforms: [
        htmlTransform,
        reactTransform,
        { ...vueTransform, scope: ['routes/(vue3)'] },
        { ...vue2Transform, scope: ['routes/(vue2)'] },
        svelteTransform,
        {
          ...solidTransform,
          scope: [
            'routes/(components)/solid',
            'routes/frameworks/solid',
            'routes/shadow-dom/solid',
            'routes/streaming/solid',
          ],
        },
        {
          ...preactTransform,
          scope: [
            'routes/(components)/preact',
            'routes/frameworks/preact',
            'routes/shadow-dom/preact',
            'routes/streaming/preact',
          ],
        },
        webComponentsTransform,
        litTransform,
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
