import type { Plugin } from 'vite';
import { exportRenderPlugin } from './export-render';
import { importRenderPlugin } from './import-render';
import type { WebWidgetUserConfig } from './types';

export function webWidgetPlugin(
  options: WebWidgetUserConfig | (() => Promise<WebWidgetUserConfig>)
): Plugin[] {
  let resolvedOptions: WebWidgetUserConfig;
  if (!options) {
    throw new TypeError(`options is required.`);
  }

  const getOptions = async () =>
    (resolvedOptions ??=
      typeof options === 'function' ? await options() : options);

  return [
    ...exportRenderPlugin(async () => {
      const {
        manifest,
        provide,
        export: exports,
        // import: imports,
      } = await getOptions();
      return {
        extractFromExportDefault: exports?.extractFromExportDefault,
        exclude: exports?.exclude,
        include: exports?.include,
        inject: exports?.inject,
        manifest,
        provide,
      };
    }),

    ...importRenderPlugin(async () => {
      const {
        manifest,
        provide,
        // export: exports,
        import: imports,
      } = await getOptions();
      return {
        cache: imports?.cache,
        exclude: imports?.exclude,
        excludeImporter: imports?.excludeImporter,
        include: imports?.include,
        includeImporter: imports?.includeImporter,
        inject: imports?.inject,
        manifest,
        provide,
      };
    }),
  ];
}
