import { defineConfig, type Plugin } from 'vite';
import { webWidgetPlugin } from '@web-widget/vite-plugin';
import { vuePresetsPlugin } from './packages/vue3/vite-plugins';
import { vue2PresetsPlugin } from './packages/vue2/vite-plugins';
import { reactPresetsPlugin } from './packages/react/vite-plugins';

function patchVuePluginConfig(): Plugin {
  return {
    name: 'patchVuePluginConfig',
    enforce: 'post',
    async config() {
      return {
        optimizeDeps: {
          // Avoid version conflicts caused by `optimizeDeps`.
          exclude: ['vue'],
        },
      };
    },
    async configResolved(config) {
      const alias = config.resolve.alias;
      const dedupe = config.resolve.dedupe;

      if (dedupe) {
        // Patch vue3 plugin config.
        // @see https://github.com/vitejs/vite-plugin-vue/blob/main/packages/plugin-vue/src/index.ts#L147
        dedupe.splice(dedupe.indexOf('vue'), 1);
      }

      if (alias) {
        // Patch vue2 plugin config.
        // @see https://github.com/vitejs/vite-plugin-vue2/blob/main/src/index.ts#L103
        if (Array.isArray(alias)) {
          alias.splice(alias.findIndex(({ find }) => find === 'vue'));
        }
      }
    },
  };
}

function createInputMap(names: string[], type: 'client' | 'server') {
  const inputMap: Record<string, string> = {};
  if (type === 'client') {
    inputMap['index.html'] = 'index.html';
  }
  for (const name of names) {
    if (type === 'client') {
      inputMap[`${name}`] = `${name}.html`;
    } else {
      inputMap[`${name}`] = `packages/${name}/entry-${type}.ts`;
    }
  }
  return inputMap;
}

export default defineConfig(({ isSsrBuild }) => {
  const type = isSsrBuild ? 'server' : 'client';
  return {
    plugins: [
      patchVuePluginConfig(),
      reactPresetsPlugin(),
      vuePresetsPlugin(),
      vue2PresetsPlugin(),
      webWidgetPlugin({
        adapters: [
          { from: '@web-widget/react', scope: ['packages/react'] },
          { from: '@web-widget/vue', scope: ['packages/vue3'] },
          { from: '@web-widget/vue2', scope: ['packages/vue2'] },
        ],
      }),
    ],
    build: {
      manifest: isSsrBuild ? false : true,
      outDir: `dist/${type}`,
      rolldownOptions: {
        input: {
          ...createInputMap(['react', 'vue3', 'vue2'], type),
        },
      },
    },
  };
});
