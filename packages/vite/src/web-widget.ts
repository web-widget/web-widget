import path from "node:path";
import type { Plugin, UserConfig } from "vite";
import {
  exportWebWidgetPlugin,
  type ExportWidgetPluginOptions,
} from "./build/export-web-widget";
import {
  importWebWidgetPlugin,
  type ImportWebWidgetPluginOptions,
} from "./build/import-web-widget";
import { getGlobalConfig, pluginContainer } from "./container";
import type { ResolvedBuilderConfig } from "./types";

export interface WebWidgetPluginOptions {
  provide?: string;
  manifest?: ExportWidgetPluginOptions["manifest"];
  /**@deprecated Please use `export` instead. */
  toWebWidgets?: Partial<
    ExportWidgetPluginOptions & {
      manifest?: ExportWidgetPluginOptions["manifest"];
      provide?: ExportWidgetPluginOptions["provide"];
    }
  >;
  export?: Partial<
    ExportWidgetPluginOptions & {
      manifest?: ExportWidgetPluginOptions["manifest"];
      provide?: ExportWidgetPluginOptions["provide"];
    }
  >;
  /**@deprecated Please use `import` instead. */
  toComponents?: Partial<
    ImportWebWidgetPluginOptions & {
      manifest?: ImportWebWidgetPluginOptions["manifest"];
      provide?: ImportWebWidgetPluginOptions["provide"];
    }
  >;
  import?: Partial<
    ImportWebWidgetPluginOptions & {
      manifest?: ImportWebWidgetPluginOptions["manifest"];
      provide?: ImportWebWidgetPluginOptions["provide"];
    }
  >;
}

export function webWidgetPlugin(options: WebWidgetPluginOptions): Plugin[] {
  let { manifest, provide } = options;
  const importWidget = options.import ?? options.toComponents;
  const exportWidget = options.export ?? options.toWebWidgets;
  const plugins: Plugin[] = [];

  if (exportWidget) {
    plugins.push(
      pluginContainer<ExportWidgetPluginOptions>(
        exportWebWidgetPlugin,
        (userConfig) => {
          if (!manifest) {
            manifest = getManifest(userConfig);
          }

          return {
            ...exportWidget,
            provide: (exportWidget.provide ?? provide) as string,
            manifest: manifest,
          };
        }
      ) as unknown as Plugin
    );
  }

  if (importWidget) {
    plugins.push(
      pluginContainer<ImportWebWidgetPluginOptions>(
        importWebWidgetPlugin,
        (userConfig) => {
          if (!manifest) {
            manifest = getManifest(userConfig);
          }
          return {
            ...importWidget,
            provide: (importWidget.provide ?? provide) as string,
            manifest,
          };
        }
      ) as unknown as Plugin
    );
  }

  return plugins;
}

function getManifest(userConfig: UserConfig) {
  const { root = process.cwd() } = userConfig;
  const resolvedBuilderConfig =
    getGlobalConfig<ResolvedBuilderConfig>(userConfig);

  if (resolvedBuilderConfig) {
    const viteManifest = path.resolve(
      root,
      resolvedBuilderConfig.output.dir,
      resolvedBuilderConfig.output.client,
      resolvedBuilderConfig.output.manifest
    );
    return viteManifest;
  }
}
