import { createFilter } from '@rollup/pluginutils';
import type { Plugin } from 'vite';
import { WEB_ROUTER_PLUGIN_NAME } from './constants';
import { exportRenderPlugin } from './export-render';
import { importRenderPlugin } from './import-render';
import type {
  DynamicImportPredicate,
  WebRouterPlugin,
  WebWidgetUserConfig,
} from './types';

function registerDynamicImportPredicate(
  predicate: DynamicImportPredicate
): Plugin {
  return {
    name: '@web-widget:register-dynamic-import-predicate',
    enforce: 'post',
    configResolved(config) {
      const router = config.plugins.find(
        (p) => p.name === WEB_ROUTER_PLUGIN_NAME
      ) as WebRouterPlugin | undefined;
      if (router?.api) {
        router.api.dynamicImportPredicate = predicate;
      }
    },
  };
}

export function webWidgetPlugin(options: WebWidgetUserConfig): Plugin[] {
  if (!options) {
    throw new TypeError(`options is required.`);
  }

  const {
    manifest,
    provide,
    toWebWidgets,
    toComponents,
    export: exports = toWebWidgets,
    import: imports = toComponents,
  } = options;

  const filterImportPath = createFilter(imports?.include, imports?.exclude);
  const dynamicImportPredicate: DynamicImportPredicate = (key: string) =>
    filterImportPath(key);

  return [
    registerDynamicImportPredicate(dynamicImportPredicate),
    ...exportRenderPlugin({
      extractFromExportDefault: exports?.extractFromExportDefault,
      exclude: exports?.exclude,
      include: exports?.include,
      inject: exports?.inject,
      manifest,
      provide,
      dynamicImportPredicate,
    }),

    ...importRenderPlugin({
      cache: imports?.cache,
      component: imports?.component,
      exclude: imports?.exclude,
      excludeImporter: imports?.excludeImporter,
      include: imports?.include,
      includeImporter: imports?.includeImporter,
      inject: imports?.inject,
      manifest,
      provide,
    }),
  ];
}
