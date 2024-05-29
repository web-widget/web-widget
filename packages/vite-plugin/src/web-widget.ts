import type { Plugin } from 'vite';
import { exportRenderPlugin } from './export-render';
import { importRenderPlugin } from './import-render';
import type { WebWidgetUserConfig } from './types';

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

  return [
    ...exportRenderPlugin({
      extractFromExportDefault: exports?.extractFromExportDefault,
      exclude: exports?.exclude,
      include: exports?.include,
      inject: exports?.inject,
      manifest,
      provide,
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
