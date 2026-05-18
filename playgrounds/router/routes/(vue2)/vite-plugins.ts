import url from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
import vue2Plugin from '@vitejs/plugin-vue2';
import vue2WebWidgetPlugin from '@web-widget/vue2/vite';
import { normalizePath } from 'vite';
import {
  type VueRuntimeResolveRule,
  isolateVueSfcPlugin,
  stripVue2PluginGlobalVueAlias,
} from '../../vite-plugins/vue-coexistence';

export function vue2RuntimeResolveRule(): VueRuntimeResolveRule {
  return {
    packageJsonId: '@playgrounds/web-router-vue2/package.json',
    runtimeImportId: 'vue/dist/vue.runtime.esm.js',
    runtimeSubpath: 'dist/vue.runtime.esm.js',
    importerIncludes: ['/routes/(vue2)/', '/packages/vue2/'],
  };
}

// Resolve compiler-sfc from @playgrounds/web-router-vue2 (Vue 2.7), not hoisted Vue 3.
const requireFromVue2 = createRequire(
  url.fileURLToPath(
    import.meta.resolve('@playgrounds/web-router-vue2/package.json')
  )
);
const resolveVue2Compiler = () => requireFromVue2('vue/compiler-sfc');

const encode = (string: string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const workspace = normalizePath(
  path.join(path.dirname(url.fileURLToPath(import.meta.url)), path.sep)
);

export function vue2PresetsPlugin() {
  const compiler = resolveVue2Compiler();
  const vuePlugin = isolateVueSfcPlugin(
    stripVue2PluginGlobalVueAlias(
      vue2Plugin({
        compiler,
        include: new RegExp(`^${encode(workspace)}.*\\.vue$`),
      })
    ),
    {
      workspace,
      virtualIds: ['\0plugin-vue2:normalizer', '\0plugin-vue2:hmr-runtime'],
    }
  );

  return [
    vuePlugin,
    vue2WebWidgetPlugin({
      workspace,
    }),
  ];
}
