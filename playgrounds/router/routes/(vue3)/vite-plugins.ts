import url from 'node:url';
import path from 'node:path';
import vue3Plugin from '@vitejs/plugin-vue';
import { normalizePath } from 'vite';
import {
  type VueRuntimeResolveRule,
  vueCoexistencePlugins as buildVueRuntimeResolvePlugins,
  isolateVueSfcPlugin,
  stripVue3PluginGlobalDedupe,
} from '../../vite-plugins/vue-coexistence';
import { vue2RuntimeResolveRule } from '../(vue2)/vite-plugins';

export function vue3RuntimeResolveRule(): VueRuntimeResolveRule {
  return {
    packageJsonId: '@playgrounds/web-router-vue3/package.json',
    runtimeImportId: 'vue/dist/vue.runtime.esm-bundler.js',
    runtimeSubpath: 'dist/vue.runtime.esm-bundler.js',
    importerIncludes: ['/routes/(vue3)/', '/packages/vue/'],
  };
}

const encode = (string: string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const workspace = normalizePath(
  path.join(path.dirname(url.fileURLToPath(import.meta.url)), path.sep)
);

export function vuePresetsPlugin() {
  const runtimeResolvePlugins = buildVueRuntimeResolvePlugins([
    vue3RuntimeResolveRule(),
    vue2RuntimeResolveRule(),
  ]);

  const vuePlugin = isolateVueSfcPlugin(
    stripVue3PluginGlobalDedupe(
      vue3Plugin({
        include: new RegExp(`^${encode(workspace)}.*\\.vue$`),
      })
    ),
    {
      workspace,
      virtualIds: ['\0plugin-vue:export-helper'],
    }
  );

  return [...runtimeResolvePlugins, vuePlugin];
}
