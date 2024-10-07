import path from 'node:path';
import fs from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
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
  const manifest = isSsrBuild
    ? JSON.parse(
        fs.readFileSync(
          path.resolve(__dirname, 'dist/client/.vite/manifest.json'),
          'utf-8'
        )
      )
    : undefined;
  return {
    // define: {
    //   'import.meta.env.VITE_HYDRATE_MODE': process.env.VITE_HYDRATE_MODE
    //     ? JSON.stringify(process.env.VITE_HYDRATE_MODE)
    //     : null,
    // },
    plugins: [
      patchVuePluginConfig(),
      reactPresetsPlugin(manifest),
      vuePresetsPlugin(manifest),
      vue2PresetsPlugin(manifest),
    ],
    build: {
      manifest: isSsrBuild ? false : true,
      outDir: `dist/${type}`,
      rollupOptions: {
        input: {
          ...createInputMap(['react', 'vue3', 'vue2'], type),
        },
      },
    },
  };
});
